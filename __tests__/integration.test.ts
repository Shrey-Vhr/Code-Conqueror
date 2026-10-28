import { describe, it, expect, beforeAll } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  requestBooking,
  approveBooking,
  checkInBooking,
  returnBooking,
  cancelBooking,
  recalculateWaitlistScores,
} from "@/lib/bookingService";
import { sweepOverdue } from "@/lib/overdue";
import { canManageResource, canReviewBooking, isStaff } from "@/lib/rbac";

function getFutureWeekdaySlot(daysAhead: number, startHour = 10, durationHours = 2) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  // Ensure it lands on a weekday (Mon=1 ... Fri=5)
  if (d.getDay() === 0) d.setDate(d.getDate() + 1); // Sun -> Mon
  if (d.getDay() === 6) d.setDate(d.getDate() + 2); // Sat -> Mon

  const start = new Date(d);
  start.setHours(startHour, 0, 0, 0);
  const end = new Date(d);
  end.setHours(startHour + durationHours, 0, 0, 0);
  return { start, end };
}

describe("CampusShare End-to-End Integration Suite", () => {
  let aliceUser: any;
  let bobUser: any;
  let carolUser: any;
  let daveOwner: any;
  let eveManager: any;
  let frankAdmin: any;
  let printerResource: any;

  beforeAll(async () => {
    aliceUser = await prisma.user.findUnique({ where: { email: "alice@northfield.edu" } });
    bobUser = await prisma.user.findUnique({ where: { email: "bob@northfield.edu" } });
    carolUser = await prisma.user.findUnique({ where: { email: "carol@northfield.edu" } });
    daveOwner = await prisma.user.findUnique({ where: { email: "dave@northfield.edu" } });
    eveManager = await prisma.user.findUnique({ where: { email: "eve@northfield.edu" } });
    frankAdmin = await prisma.user.findUnique({ where: { email: "frank@northfield.edu" } });
    printerResource = await prisma.resource.findUnique({
      where: { id: "res-ultimaker-3d" },
      include: { requirements: true },
    });
  });

  beforeEach(async () => {
    // Reset test users credits and strikes
    await prisma.user.updateMany({
      where: { email: { in: ["alice@northfield.edu", "bob@northfield.edu", "carol@northfield.edu"] } },
      data: { credits: 100, strikes: 0, suspendedUntil: null },
    });

    // Remove any test bookings on printerResource not in seed
    await prisma.conditionReport.deleteMany({
      where: { booking: { resourceId: "res-ultimaker-3d", id: { not: "booking-demo-bob-overdue" } } },
    });
    await prisma.incident.deleteMany({
      where: { resourceId: "res-ultimaker-3d", id: { not: "incident-demo-delay" } },
    });
    await prisma.booking.deleteMany({
      where: { resourceId: "res-ultimaker-3d", id: { not: "booking-demo-bob-overdue" } },
    });
  });

  it("1. Lifecycle: Request -> Approve -> Check-in -> Clean Return -> Complete", async () => {
    expect(aliceUser).toBeDefined();
    expect(printerResource).toBeDefined();
    expect(printerResource.ownerId).toBe(daveOwner.id);

    const { start, end } = getFutureWeekdaySlot(5, 10, 2);

    // 1. Submit request
    const reqRes = await requestBooking({
      userId: aliceUser.id,
      resourceId: printerResource.id,
      start,
      end,
      purpose: "COURSEWORK",
      purposeDetails: "Senior robotics gear casing print",
    });

    expect(reqRes.success).toBe(true);
    expect(reqRes.status).toBe("PENDING");
    const bookingId = (reqRes as any).bookingId;

    // Verify booking in DB
    let b = await prisma.booking.findUnique({ where: { id: bookingId } });
    expect(b?.status).toBe("PENDING");
    expect(b?.depositHeld).toBe(printerResource.depositCredits);

    // 2. Owner approves
    const appRes = await approveBooking({
      bookingId,
      reviewerId: daveOwner.id,
      decisionReason: "Approved for robotics capstone print",
    });
    expect(appRes.success).toBe(true);

    b = await prisma.booking.findUnique({ where: { id: bookingId } });
    expect(b?.status).toBe("APPROVED");
    expect(b?.reviewerId).toBe(daveOwner.id);

    // 3. Check-in inspection (simulate active time window)
    await prisma.booking.update({
      where: { id: bookingId },
      data: { start: new Date(), end: new Date(Date.now() + 1000 * 60 * 60 * 2) },
    });

    const checkInRes = await checkInBooking({
      bookingId,
      actorId: aliceUser.id,
      rating: 5,
      checklist: ["Bed cleaned", "Filament loaded", "No nozzle clog"],
      notes: "Printer in pristine working state",
      photoUrl: "data:image/png;base64,mockCheckInPhoto",
    });
    expect(checkInRes.success).toBe(true);

    b = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { conditionReports: true },
    });
    expect(b?.status).toBe("CHECKED_IN");
    expect(b?.conditionReports.length).toBe(1);
    expect(b?.conditionReports[0].phase).toBe("CHECK_IN");
    expect(b?.conditionReports[0].rating).toBe(5);

    // 4. Return inspection checkout (clean return)
    const initialCredits = (await prisma.user.findUnique({ where: { id: aliceUser.id } }))?.credits || 0;

    const returnRes = await returnBooking({
      bookingId,
      actorId: aliceUser.id,
      rating: 5,
      checklist: ["Print removed cleanly", "Nozzle purged", "Bed wiped with IPA"],
      notes: "Part finished accurately, no issues",
      photoUrl: "data:image/png;base64,mockReturnPhoto",
    });
    expect(returnRes.success).toBe(true);

    b = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { conditionReports: true },
    });
    // Clean return transitions directly to COMPLETED and releases deposit
    expect(b?.status).toBe("COMPLETED");
    expect(b?.depositHeld).toBe(0);
    expect(b?.conditionReports.length).toBe(2);

    // Verify credits settled
    const updatedCredits = (await prisma.user.findUnique({ where: { id: aliceUser.id } }))?.credits || 0;
    expect(updatedCredits).toBeGreaterThanOrEqual(initialCredits);
  });

  it("2. Double-Booking Prevention: Auto-waitlists overlapping PENDING requests on approval", async () => {
    const { start: slotStart, end: slotEnd } = getFutureWeekdaySlot(8, 14, 2);

    // Alice requests slot
    const req1 = await requestBooking({
      userId: aliceUser.id,
      resourceId: printerResource.id,
      start: slotStart,
      end: slotEnd,
      purpose: "RESEARCH",
      purposeDetails: "Bio-compatible scaffold test print",
    });
    expect(req1.success).toBe(true);
    expect(req1.status).toBe("PENDING");
    const booking1Id = (req1 as any).bookingId;

    // Bob requests overlapping slot (starts 1 hour into Alice's slot)
    const overlapStart = new Date(slotStart.getTime() + 1000 * 60 * 60);
    const overlapEnd = new Date(slotEnd.getTime() + 1000 * 60 * 60);

    const req2 = await requestBooking({
      userId: bobUser.id,
      resourceId: printerResource.id,
      start: overlapStart,
      end: overlapEnd,
      purpose: "COURSEWORK",
      purposeDetails: "Formula SAE bracket print",
    });
    expect(req2.success).toBe(true);
    expect(req2.status).toBe("PENDING");
    const booking2Id = (req2 as any).bookingId;

    // Owner approves Alice's request
    const appRes = await approveBooking({
      bookingId: booking1Id,
      reviewerId: daveOwner.id,
      decisionReason: "Approved for bio-compatible scaffold print",
    });
    expect(appRes.success).toBe(true);

    // Bob's overlapping request MUST be automatically moved to WAITLISTED
    const bobBooking = await prisma.booking.findUnique({ where: { id: booking2Id } });
    expect(bobBooking?.status).toBe("WAITLISTED");
    expect(bobBooking?.waitlistPosition).toBe(1);

    // Attempting to approve Bob's now-waitlisted booking returns status error
    const doubleApproveWaitlisted = await approveBooking({
      bookingId: booking2Id,
      reviewerId: daveOwner.id,
      decisionReason: "Approval attempt on waitlisted booking",
    });
    expect(doubleApproveWaitlisted.success).toBe(false);
    expect(doubleApproveWaitlisted.error).toContain("Cannot approve booking in status \"WAITLISTED\"");

    // If an overlapping booking is PENDING, the transaction conflict check catches and rejects it
    await prisma.booking.update({
      where: { id: booking2Id },
      data: { status: "PENDING" },
    });

    await expect(
      approveBooking({
        bookingId: booking2Id,
        reviewerId: daveOwner.id,
        decisionReason: "Double approval attempt on overlapping pending slot",
      })
    ).rejects.toThrow("Cannot approve: this time slot conflicts with an already approved or active booking.");
  });

  it("3. Transparent Waitlist Auto-Promotion: Cancellation promotes top waitlisted candidate to PENDING", async () => {
    const { start: slotStart, end: slotEnd } = getFutureWeekdaySlot(12, 11, 2);

    // 1. User Alice books and gets approved
    const reqAlice = await requestBooking({
      userId: aliceUser.id,
      resourceId: printerResource.id,
      start: slotStart,
      end: slotEnd,
      purpose: "RESEARCH",
    });
    const aliceId = (reqAlice as any).bookingId;

    await approveBooking({
      bookingId: aliceId,
      reviewerId: daveOwner.id,
      decisionReason: "Approved",
    });

    // 2. User Bob requests same slot -> goes to WAITLISTED because slot is already approved
    const reqBob = await requestBooking({
      userId: bobUser.id,
      resourceId: printerResource.id,
      start: slotStart,
      end: slotEnd,
      purpose: "COURSEWORK",
    });
    expect(reqBob.status).toBe("WAITLISTED");
    const bobId = (reqBob as any).bookingId;

    // 3. Alice cancels her approved reservation
    const cancelRes = await cancelBooking({
      bookingId: aliceId,
      actorId: aliceUser.id,
      reason: "Experiment delayed, releasing slot",
    });

    expect(cancelRes.success).toBe(true);
    expect(cancelRes.promotedBookingId).toBe(bobId);

    // Bob's booking MUST be promoted to PENDING for owner review
    const bobUpdated = await prisma.booking.findUnique({ where: { id: bobId } });
    expect(bobUpdated?.status).toBe("PENDING");
    expect(bobUpdated?.waitlistPosition).toBeNull();
  });

  it("4. Overdue and No-Show Sweeps", async () => {
    // 1. Create a simulated no-show booking (APPROVED, start was 45 min ago)
    const pastStart = new Date(Date.now() - 1000 * 60 * 45);
    const pastEnd = new Date(Date.now() + 1000 * 60 * 60);

    const noShowBooking = await prisma.booking.create({
      data: {
        userId: bobUser.id,
        resourceId: printerResource.id,
        start: pastStart,
        end: pastEnd,
        purpose: "PERSONAL",
        status: "APPROVED",
        depositHeld: 10,
      },
    });

    const bobInitialStrikes = (await prisma.user.findUnique({ where: { id: bobUser.id } }))?.strikes || 0;

    // Run sweep
    const sweepResult = await sweepOverdue();
    expect(sweepResult.noShowCount).toBeGreaterThanOrEqual(1);

    // Verify booking cancelled
    const swept = await prisma.booking.findUnique({ where: { id: noShowBooking.id } });
    expect(swept?.status).toBe("CANCELLED");

    // Verify conduct strike added to Bob
    const bobFinalStrikes = (await prisma.user.findUnique({ where: { id: bobUser.id } }))?.strikes || 0;
    expect(bobFinalStrikes).toBe(bobInitialStrikes + 1);
  });

  it("5. Role-Based Access Control Verification", () => {
    // Staff check
    expect(isStaff("STUDENT")).toBe(false);
    expect(isStaff("RESEARCHER")).toBe(false);
    expect(isStaff("OWNER")).toBe(true);
    expect(isStaff("MANAGER")).toBe(true);
    expect(isStaff("ADMIN")).toBe(true);

    // Dave (OWNER of Engineering) can manage printer resource (owned by Dave)
    expect(
      canManageResource(
        { id: daveOwner.id, role: "OWNER", department: "Engineering", email: daveOwner.email, name: daveOwner.name },
        printerResource
      )
    ).toBe(true);

    // Dave CANNOT manage a Biology resource owned by someone else
    expect(
      canManageResource(
        { id: daveOwner.id, role: "OWNER", department: "Engineering", email: daveOwner.email, name: daveOwner.name },
        { ownerId: "someone-else", department: "Biology" }
      )
    ).toBe(false);

    // Frank (ADMIN) can manage any department resource
    expect(
      canManageResource(
        { id: frankAdmin.id, role: "ADMIN", department: "Campus", email: frankAdmin.email, name: frankAdmin.name },
        { ownerId: "someone-else", department: "Biology" }
      )
    ).toBe(true);

    // Eve (MANAGER of Engineering) can review Engineering bookings
    expect(
      canReviewBooking(
        { id: eveManager.id, role: "MANAGER", department: "Engineering", email: eveManager.email, name: eveManager.name },
        printerResource
      )
    ).toBe(true);

    // Eve CANNOT review Biology bookings
    expect(
      canReviewBooking(
        { id: eveManager.id, role: "MANAGER", department: "Engineering", email: eveManager.email, name: eveManager.name },
        { ownerId: "someone-else", department: "Biology" }
      )
    ).toBe(false);
  });
});
