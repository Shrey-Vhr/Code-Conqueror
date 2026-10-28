import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { addHours, subHours, addDays } from "date-fns";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Northfield University CampusShare database...");

  // 1. Seed Users
  const alicePass = await bcrypt.hash("Alice2024!", 10);
  const bobPass = await bcrypt.hash("Bob2024!", 10);
  const carolPass = await bcrypt.hash("Carol2024!", 10);
  const davePass = await bcrypt.hash("Dave2024!", 10);
  const evePass = await bcrypt.hash("Eve2024!", 10);
  const frankPass = await bcrypt.hash("Frank2024!", 10);

  const alice = await prisma.user.upsert({
    where: { email: "alice@northfield.edu" },
    update: {},
    create: {
      email: "alice@northfield.edu",
      name: "Alice Johnson",
      password: alicePass,
      role: "STUDENT",
      department: "Engineering",
      verified: true,
      emailVerified: true,
      credits: 150,
      strikes: 0,
    },
  });

  const bob = await prisma.user.upsert({
    where: { email: "bob@northfield.edu" },
    update: {},
    create: {
      email: "bob@northfield.edu",
      name: "Bob Martinez",
      password: bobPass,
      role: "STUDENT",
      department: "Engineering",
      verified: true,
      emailVerified: true,
      credits: 75,
      strikes: 1,
    },
  });

  const carol = await prisma.user.upsert({
    where: { email: "carol@northfield.edu" },
    update: {},
    create: {
      email: "carol@northfield.edu",
      name: "Dr. Carol Zhang",
      password: carolPass,
      role: "RESEARCHER",
      department: "Biology",
      verified: true,
      emailVerified: true,
      credits: 350,
      strikes: 0,
    },
  });

  const dave = await prisma.user.upsert({
    where: { email: "dave@northfield.edu" },
    update: {},
    create: {
      email: "dave@northfield.edu",
      name: "Prof. Dave Miller",
      password: davePass,
      role: "OWNER",
      department: "Engineering",
      verified: true,
      emailVerified: true,
      credits: 500,
      strikes: 0,
    },
  });

  const eve = await prisma.user.upsert({
    where: { email: "eve@northfield.edu" },
    update: {},
    create: {
      email: "eve@northfield.edu",
      name: "Eve Sinclair",
      password: evePass,
      role: "MANAGER",
      department: "Engineering",
      verified: true,
      emailVerified: true,
      credits: 500,
      strikes: 0,
    },
  });

  const frank = await prisma.user.upsert({
    where: { email: "frank@northfield.edu" },
    update: {},
    create: {
      email: "frank@northfield.edu",
      name: "Frank Reynolds (Dean of Facilities)",
      password: frankPass,
      role: "ADMIN",
      department: "Campus",
      verified: true,
      emailVerified: true,
      credits: 1000,
      strikes: 0,
    },
  });

  console.log("Users seeded successfully.");

  // 2. Seed Trainings
  const laserTraining = await prisma.training.upsert({
    where: { code: "ENG-TR-01" },
    update: {},
    create: {
      name: "Epilog Laser Cutter Safety & Operation",
      code: "ENG-TR-01",
      description: "Covers laser optics safety, exhaust ventilation checks, vector cutting settings, and fire mitigation protocols.",
      department: "Engineering",
      validDurationDays: 365,
    },
  });

  const printingTraining = await prisma.training.upsert({
    where: { code: "ENG-TR-02" },
    update: {},
    create: {
      name: "Additive Manufacturing & 3D Printing Certification",
      code: "ENG-TR-02",
      description: "Covers FDM/SLA slicer setup, bed leveling, heated nozzle handling, and resin wash/cure protocols.",
      department: "Engineering",
      validDurationDays: 365,
    },
  });

  const bsl2Training = await prisma.training.upsert({
    where: { code: "BIO-TR-01" },
    update: {},
    create: {
      name: "Biosafety Level 2 (BSL-2) Protocol & Waste Disposal",
      code: "BIO-TR-01",
      description: "Mandatory certification for handling human cell lines, viral vectors, autoclave sterilization, and biohazard containment.",
      department: "Biology",
      validDurationDays: 365,
    },
  });

  const hpcTraining = await prisma.training.upsert({
    where: { code: "CS-TR-01" },
    update: {},
    create: {
      name: "HPC Cluster & Slurm Workload Manager",
      code: "CS-TR-01",
      description: "Covers batch job scheduling, multi-GPU allocation, shared scratch filesystem etiquette, and CUDA environment modules.",
      department: "Engineering",
      validDurationDays: 365,
    },
  });

  const mediaTraining = await prisma.training.upsert({
    where: { code: "MED-TR-01" },
    update: {},
    create: {
      name: "Cinema Cameras & Studio Audio Systems",
      code: "MED-TR-01",
      description: "Covers cinema sensor care, XLR phantom power routing, studio acoustic isolation, and equipment inventory checkouts.",
      department: "Media",
      validDurationDays: 365,
    },
  });

  console.log("Trainings seeded.");

  // 3. Seed Certifications
  // Alice has: Laser + 3D Printing
  await prisma.userCertification.upsert({
    where: { id: "cert-alice-laser" },
    update: {},
    create: {
      id: "cert-alice-laser",
      userId: alice.id,
      trainingId: laserTraining.id,
      status: "VERIFIED",
      expiresAt: addDays(new Date(), 300),
      documentNote: "Completed hands-on workshop with Lab Tech Jenkins on 2024-09-15.",
      verifiedById: frank.id,
    },
  });

  await prisma.userCertification.upsert({
    where: { id: "cert-alice-3d" },
    update: {},
    create: {
      id: "cert-alice-3d",
      userId: alice.id,
      trainingId: printingTraining.id,
      status: "VERIFIED",
      expiresAt: addDays(new Date(), 280),
      documentNote: "Completed Makerspace intro and test print evaluation.",
      verifiedById: frank.id,
    },
  });

  // Bob has: 3D printing (verified), and Laser is PENDING with document submitted!
  await prisma.userCertification.upsert({
    where: { id: "cert-bob-3d" },
    update: {},
    create: {
      id: "cert-bob-3d",
      userId: bob.id,
      trainingId: printingTraining.id,
      status: "VERIFIED",
      expiresAt: addDays(new Date(), 180),
      documentNote: "Online tutorial completed. Tested on Prusa MK3.",
      verifiedById: eve.id,
    },
  });

  await prisma.userCertification.upsert({
    where: { id: "cert-bob-laser-pending" },
    update: {},
    create: {
      id: "cert-bob-laser-pending",
      userId: bob.id,
      trainingId: laserTraining.id,
      status: "PENDING",
      expiresAt: null,
      documentNote: "Attended safety lecture #102 on Monday. Certificate of completion issued by Northfield Safety Board #NF-9821.",
      verifiedById: null,
    },
  });

  await prisma.userCertification.upsert({
    where: { id: "cert-bob-hpc" },
    update: {},
    create: {
      id: "cert-bob-hpc",
      userId: bob.id,
      trainingId: hpcTraining.id,
      status: "VERIFIED",
      expiresAt: addDays(new Date(), 365),
      documentNote: "Completed HPC Slurm workload & multi-GPU training workshop.",
      verifiedById: frank.id,
    },
  });

  // Carol has: BSL-2 + HPC
  await prisma.userCertification.upsert({
    where: { id: "cert-carol-bsl2" },
    update: {},
    create: {
      id: "cert-carol-bsl2",
      userId: carol.id,
      trainingId: bsl2Training.id,
      status: "VERIFIED",
      expiresAt: addDays(new Date(), 350),
      documentNote: "NIH Biosafety Compliance verification on record.",
      verifiedById: frank.id,
    },
  });

  await prisma.userCertification.upsert({
    where: { id: "cert-carol-hpc" },
    update: {},
    create: {
      id: "cert-carol-hpc",
      userId: carol.id,
      trainingId: hpcTraining.id,
      status: "VERIFIED",
      expiresAt: addDays(new Date(), 360),
      documentNote: "PI cluster access grant approval.",
      verifiedById: frank.id,
    },
  });

  console.log("Certifications seeded.");

  // 4. Seed Resources (12 realistic campus resources)
  const defaultAvailability = JSON.stringify([
    { dayOfWeek: 1, start: "08:00", end: "21:00" },
    { dayOfWeek: 2, start: "08:00", end: "21:00" },
    { dayOfWeek: 3, start: "08:00", end: "21:00" },
    { dayOfWeek: 4, start: "08:00", end: "21:00" },
    { dayOfWeek: 5, start: "08:00", end: "21:00" },
    { dayOfWeek: 6, start: "10:00", end: "18:00" },
  ]);

  const resourcesData = [
    {
      id: "res-laser-cutter",
      name: "Epilog Fusion Pro 48 Laser Cutter",
      type: "EQUIPMENT",
      category: "Digital Fabrication",
      location: "Engineering Building, Workshop B-12",
      description: "High-precision 80W CO2 laser cutter and engraver. Ideal for acrylic, MDF, Delrin, and cardboard architectural models. 1200 DPI resolution.",
      image: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80",
      rules: "Strictly NO PVC or vinyl cutting. Fume extraction must be turned on prior to laser firing. Never leave unattended while operating.",
      ownerId: dave.id,
      department: "Engineering",
      requiresSupervision: false,
      depositCredits: 20,
      creditCostPerHour: 10,
      maxHoursPerBooking: 4,
      maxBookingsPerWeek: 3,
      status: "ACTIVE",
      availabilityWindows: defaultAvailability,
      trainingRequiredId: laserTraining.id,
    },
    {
      id: "res-ultimaker-3d",
      name: "UltiMaker S5 Dual Extruder 3D Printer",
      type: "EQUIPMENT",
      category: "Rapid Prototyping",
      location: "Engineering Makerspace, Room 102",
      description: "Industrial-grade dual extrusion 3D printer supporting PLA, Tough PLA, ABS, and soluble PVA supports for complex engineering geometries.",
      image: "https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=800&q=80",
      rules: "Clean build plate with isopropyl alcohol before and after each print. Use only certified filament reels.",
      ownerId: dave.id,
      department: "Engineering",
      requiresSupervision: false,
      depositCredits: 10,
      creditCostPerHour: 5,
      maxHoursPerBooking: 8,
      maxBookingsPerWeek: 4,
      status: "ACTIVE",
      availabilityWindows: defaultAvailability,
      trainingRequiredId: printingTraining.id,
    },
    {
      id: "res-formlabs-sla",
      name: "Formlabs Form 3+ SLA Resin 3D Printer",
      type: "EQUIPMENT",
      category: "Precision Prototyping",
      location: "Engineering Makerspace, Room 104",
      description: "High-accuracy stereolithography (SLA) resin printer. 25-micron resolution ideal for miniature microfluidics and jewelry prototypes.",
      image: "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=800&q=80",
      rules: "Nitrile gloves and UV safety glasses required at all times. Wash and cure parts in designated Form Wash station only.",
      ownerId: dave.id,
      department: "Engineering",
      requiresSupervision: true,
      depositCredits: 15,
      creditCostPerHour: 8,
      maxHoursPerBooking: 6,
      maxBookingsPerWeek: 2,
      status: "ACTIVE",
      availabilityWindows: defaultAvailability,
      trainingRequiredId: printingTraining.id,
    },
    {
      id: "res-keysight-oscilloscope",
      name: "Keysight Infiniium 4-Channel Mixed Signal Oscilloscope",
      type: "TOOL",
      category: "Electronics & Diagnostics",
      location: "Electrical Engineering Lab, Station 4",
      description: "1 GHz bandwidth, 5 GSa/s real-time sample rate with protocol decoding (I2C, SPI, CAN, UART). Includes active differential probes.",
      image: "https://images.unsplash.com/photo-1581092162384-8987c1d64718?auto=format&fit=crop&w=800&q=80",
      rules: "Return all probes to protective cases. Do not exceed max input voltage ratings (+/- 30V peak).",
      ownerId: dave.id,
      department: "Engineering",
      requiresSupervision: false,
      depositCredits: 10,
      creditCostPerHour: 4,
      maxHoursPerBooking: 4,
      maxBookingsPerWeek: 5,
      status: "ACTIVE",
      availabilityWindows: defaultAvailability,
    },
    {
      id: "res-dgx-compute",
      name: "NVIDIA DGX A100 AI Compute Node (4x A100 80GB)",
      type: "COMPUTE",
      category: "AI & Machine Learning",
      location: "Northfield Data Center, Rack 14",
      description: "Dedicated node with 4x NVIDIA A100 Tensor Core GPUs, 1.2TB system memory, NVLink, and direct PyTorch / JAX multi-GPU cluster support.",
      image: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80",
      rules: "Slurm jobs only. Long jobs (>6h) must run overnight during non-peak hours. Store checkpoints in persistent scratch.",
      ownerId: dave.id,
      department: "Engineering",
      requiresSupervision: false,
      depositCredits: 30,
      creditCostPerHour: 15,
      maxHoursPerBooking: 12,
      maxBookingsPerWeek: 2,
      status: "ACTIVE",
      availabilityWindows: defaultAvailability,
      trainingRequiredId: hpcTraining.id,
    },
    {
      id: "res-sony-fx6",
      name: "Sony FX6 Cinema 4K Camera Production Kit",
      type: "EQUIPMENT",
      category: "Audiovisual Production",
      location: "Media Arts Center, Checkout Cage",
      description: "Full-frame 4K camera kit with 24-70mm GM f/2.8 zoom lens, wireless lavalier mics, Pelican case, and 2x 160GB CFexpress Type A cards.",
      image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80",
      rules: "Campus use only unless off-campus travel waiver signed by Department Head. Inspect lens coating prior to checkout.",
      ownerId: eve.id,
      department: "Media",
      requiresSupervision: false,
      depositCredits: 35,
      creditCostPerHour: 10,
      maxHoursPerBooking: 8,
      maxBookingsPerWeek: 2,
      status: "ACTIVE",
      availabilityWindows: defaultAvailability,
      trainingRequiredId: mediaTraining.id,
    },
    {
      id: "res-podcast-studio",
      name: "Soundproof Podcast & Broadcast Studio",
      type: "SPACE",
      category: "Audio Production",
      location: "Media Arts Building, Room 210",
      description: "Acoustically isolated room equipped with 4x Shure SM7B dynamic microphones, Rodecaster Pro II mixer, headphones, and multi-track DAWs.",
      image: "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=800&q=80",
      rules: "No food or sugary beverages allowed inside sound booth. Leave audio cables neatly coiled on wall hangers.",
      ownerId: eve.id,
      department: "Media",
      requiresSupervision: false,
      depositCredits: 10,
      creditCostPerHour: 5,
      maxHoursPerBooking: 3,
      maxBookingsPerWeek: 3,
      status: "ACTIVE",
      availabilityWindows: defaultAvailability,
    },
    {
      id: "res-eppendorf-hood",
      name: "Eppendorf BSL-2 Cell Culture Biosafety Cabinet",
      type: "SPACE",
      category: "Biotechnology & Wet Lab",
      location: "Life Sciences Complex, Lab 310",
      description: "Class II Type A2 laminar flow biosafety cabinet with HEPA filtration, integrated UV decontamination lamp, and gas connection.",
      image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80",
      rules: "30-minute UV sterilization mandatory post-session. Dispose of biological sharps in rigid red biohazard bins only.",
      ownerId: carol.id,
      department: "Biology",
      requiresSupervision: true,
      depositCredits: 20,
      creditCostPerHour: 8,
      maxHoursPerBooking: 4,
      maxBookingsPerWeek: 3,
      status: "ACTIVE",
      availabilityWindows: defaultAvailability,
      trainingRequiredId: bsl2Training.id,
    },
    {
      id: "res-zeiss-microscope",
      name: "Zeiss Axio Observer Inverted Fluorescence Microscope",
      type: "EQUIPMENT",
      category: "Microscopy & Imaging",
      location: "Bio-Imaging Center, Suite 105",
      description: "Inverted motorized research microscope for live-cell imaging with DAPI, GFP, RFP filter cubes, and incubation chamber.",
      image: "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80",
      rules: "Never touch objective lenses with fingers. Clean immersion oil with lens tissue and ether/alcohol only.",
      ownerId: carol.id,
      department: "Biology",
      requiresSupervision: true,
      depositCredits: 25,
      creditCostPerHour: 12,
      maxHoursPerBooking: 4,
      maxBookingsPerWeek: 2,
      status: "ACTIVE",
      availabilityWindows: defaultAvailability,
      trainingRequiredId: bsl2Training.id,
    },
    {
      id: "res-seminar-room",
      name: "Collaborative Innovation & Design Thinking Lab",
      type: "SPACE",
      category: "Presentation & Workshops",
      location: "Main Library, 2nd Floor, Room 204",
      description: "Modular space with 4x mobile rolling whiteboards, 85-inch 4K touchscreen monitor with wireless AirPlay/Miracast, and seating for 24.",
      image: "https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=800&q=80",
      rules: "Wipe down whiteboards at the conclusion of session. Rearrange tables and chairs back to standard workshop configuration.",
      ownerId: frank.id,
      department: "Library",
      requiresSupervision: false,
      depositCredits: 0,
      creditCostPerHour: 0,
      maxHoursPerBooking: 4,
      maxBookingsPerWeek: 4,
      status: "ACTIVE",
      availabilityWindows: defaultAvailability,
    },
    {
      id: "res-vr-sandbox",
      name: "Spatial Computing & VR Development Sandbox",
      type: "SPACE",
      category: "Virtual & Augmented Reality",
      location: "Innovation Commons, Room 14",
      description: "5m x 5m tracked playspace with Meta Quest Pro, Apple Vision Pro developer kit, and high-performance RTX 4090 simulation rig.",
      image: "https://images.unsplash.com/photo-1593508512255-86ab42a8e620?auto=format&fit=crop&w=800&q=80",
      rules: "Sanitize VR headstraps and face cushions with alcohol wipes after each user. Clear play boundary of trip hazards.",
      ownerId: eve.id,
      department: "Media",
      requiresSupervision: false,
      depositCredits: 10,
      creditCostPerHour: 5,
      maxHoursPerBooking: 3,
      maxBookingsPerWeek: 3,
      status: "ACTIVE",
      availabilityWindows: defaultAvailability,
    },
    {
      id: "res-haas-cnc",
      name: "Haas Mini Mill 3-Axis CNC Machining Center",
      type: "EQUIPMENT",
      category: "Subtractive Machining",
      location: "Machine Shop Bay 1",
      description: "High-precision 3-axis CNC vertical milling machine with 10-tool automatic changer for aluminum, brass, and plastics.",
      image: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80",
      rules: "Eye and ear protection mandatory. Machine shop technician must review G-code simulation before cycle start.",
      ownerId: dave.id,
      department: "Engineering",
      requiresSupervision: true,
      depositCredits: 30,
      creditCostPerHour: 15,
      maxHoursPerBooking: 4,
      maxBookingsPerWeek: 2,
      status: "MAINTENANCE", // Currently undergoing scheduled spindle service
      availabilityWindows: defaultAvailability,
      trainingRequiredId: laserTraining.id,
    },
  ];

  for (const r of resourcesData) {
    const { trainingRequiredId, requiredRole, ...resourceFields } = r;

    const resource = await prisma.resource.upsert({
      where: { id: resourceFields.id },
      update: resourceFields,
      create: resourceFields,
    });

    // Create requirements if specified
    if (trainingRequiredId || requiredRole) {
      await prisma.resourceRequirement.deleteMany({
        where: { resourceId: resource.id },
      });

      await prisma.resourceRequirement.create({
        data: {
          resourceId: resource.id,
          trainingId: trainingRequiredId || null,
          requiredRole: requiredRole || null,
        },
      });
    }
  }

  console.log("12 Resources seeded.");

  // 5. Seed Realistic Bookings demonstrating full lifecycle:
  // Clean old demo bookings to prevent primary key / unique collisions
  await prisma.auditLog.deleteMany({});
  await prisma.conditionReport.deleteMany({});
  await prisma.incident.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.booking.deleteMany({});

  const now = new Date();

  // 1. OVERDUE BOOKING:
  // Bob has a CHECKED_IN booking on the Oscilloscope that ended 2 hours ago
  // (so the overdue sweep marks it OVERDUE immediately).
  const overdueStart = subHours(now, 6);
  const overdueEnd = subHours(now, 2);
  const bookingOverdue = await prisma.booking.create({
    data: {
      id: "booking-demo-bob-overdue",
      userId: bob.id,
      resourceId: "res-keysight-oscilloscope",
      start: overdueStart,
      end: overdueEnd,
      purpose: "COURSEWORK",
      purposeDetails: "Senior capstone power supply transient ripple measurement",
      status: "CHECKED_IN",
      priorityScore: 95.0,
      priorityBreakdown: JSON.stringify({
        baseScore: 100,
        recentHours30d: 4,
        recentUsagePenalty: 10,
        waitlistAgeBonus: 0,
        purposeBonus: 20,
        strikesPenalty: 25,
        roleBonus: 10,
        finalScore: 95.0,
      }),
      depositHeld: 10,
    },
  });

  // Check-in condition report for Bob's overdue booking (rating 4)
  await prisma.conditionReport.create({
    data: {
      bookingId: bookingOverdue.id,
      phase: "CHECK_IN",
      rating: 4,
      checklist: JSON.stringify(["Equipment powered on", "Probes calibrated", "No physical casing cracks"]),
      notes: "Cables slightly tangled upon pickup but device functions properly.",
      recordedById: bob.id,
      createdAt: overdueStart,
    },
  });

  // Open DELAY incident for Bob's overdue booking
  const delayIncident = await prisma.incident.create({
    data: {
      id: "incident-demo-delay",
      bookingId: bookingOverdue.id,
      resourceId: "res-keysight-oscilloscope",
      reporterId: dave.id,
      type: "DELAY",
      severity: "HIGH",
      description: "Equipment was due back 2 hours ago at Station 4. Another lab team is waiting to calibrate their circuits.",
      aiSummary: "Delay incident on Keysight Oscilloscope. Borrower Bob Martinez has exceeded the return window by 2 hours. Immediate return required.",
      status: "OPEN",
    },
  });

  // 2. WAITLIST COMPETITION:
  // Carol has an APPROVED booking on the Laser Cutter for tomorrow 10am-2pm.
  // Alice has a WAITLISTED booking on the same slot (waitlistPosition: 1, priorityScore: 85).
  const tomorrow10AM = new Date(now);
  tomorrow10AM.setDate(tomorrow10AM.getDate() + 1);
  tomorrow10AM.setHours(10, 0, 0, 0);
  const tomorrow2PM = new Date(tomorrow10AM);
  tomorrow2PM.setHours(14, 0, 0, 0);

  const bookingApprovedCarol = await prisma.booking.create({
    data: {
      id: "booking-demo-carol-approved",
      userId: carol.id,
      resourceId: "res-laser-cutter",
      start: tomorrow10AM,
      end: tomorrow2PM,
      purpose: "RESEARCH",
      purposeDetails: "Microfluidic chip PMMA substrate etching for NSF grant assay",
      status: "APPROVED",
      priorityScore: 135.0,
      decisionReason: "Approved: high-impact biology research priority.",
      reviewerId: dave.id,
      depositHeld: 20,
    },
  });

  const bookingWaitlistedAlice = await prisma.booking.create({
    data: {
      id: "booking-demo-alice-waitlist",
      userId: alice.id,
      resourceId: "res-laser-cutter",
      start: tomorrow10AM,
      end: tomorrow2PM,
      purpose: "COURSEWORK",
      purposeDetails: "Aerospace wing rib section cutting for drone chassis",
      status: "WAITLISTED",
      waitlistPosition: 1,
      priorityScore: 85.0,
      depositHeld: 20,
    },
  });

  // 3. DAMAGE INCIDENT:
  // Alice has a RETURNED booking on the 3D Printer from 3 days ago.
  // CHECK_IN report (rating: 5), CHECK_OUT report (rating: 2).
  // A DAMAGE incident exists (status: OPEN, aiSummary pre-filled).
  const threeDaysAgoStart = subHours(now, 76);
  const threeDaysAgoEnd = subHours(now, 72);

  const bookingReturnedAlice = await prisma.booking.create({
    data: {
      id: "booking-demo-alice-damage-return",
      userId: alice.id,
      resourceId: "res-ultimaker-3d",
      start: threeDaysAgoStart,
      end: threeDaysAgoEnd,
      purpose: "COURSEWORK",
      purposeDetails: "Senior robotics arm gear housing prototype print",
      status: "RETURNED",
      priorityScore: 110.0,
      depositHeld: 10,
    },
  });

  await prisma.conditionReport.create({
    data: {
      bookingId: bookingReturnedAlice.id,
      phase: "CHECK_IN",
      rating: 5,
      checklist: JSON.stringify(["Build plate clean and leveled", "Filament loaded smoothly", "No nozzle residue"]),
      notes: "Machine is in pristine condition. Extruder temperature stable at 210C.",
      recordedById: alice.id,
      createdAt: threeDaysAgoStart,
    },
  });

  await prisma.conditionReport.create({
    data: {
      bookingId: bookingReturnedAlice.id,
      phase: "CHECK_OUT",
      rating: 2,
      checklist: JSON.stringify(["Nozzle clogged with residue", "Glass build plate chipped", "Extruder gear jammed"]),
      notes: "Secondary core clogged with high-temp material; glass print plate has 20mm chip on edge.",
      recordedById: alice.id,
      createdAt: threeDaysAgoEnd,
    },
  });

  const damageIncident = await prisma.incident.create({
    data: {
      id: "incident-demo-damage",
      bookingId: bookingReturnedAlice.id,
      resourceId: "res-ultimaker-3d",
      reporterId: dave.id,
      type: "DAMAGE",
      severity: "MEDIUM",
      description: "Condition rating dropped from 5/5 at check-in to 2/5 at return. Secondary print core jammed and glass plate chipped.",
      aiSummary: "Damage reported on UltiMaker S5 3D Printer. Extruder clogged and glass plate damaged during student print. Core replacement ($115) and calibration required before next reservation.",
      status: "OPEN",
    },
  });

  // 4. PENDING REVIEW:
  // A new PENDING booking by Bob on the GPU Workstation for next week (eligible after cert was added).
  const nextWeekStart = addDays(now, 7);
  nextWeekStart.setHours(9, 0, 0, 0);
  const nextWeekEnd = new Date(nextWeekStart);
  nextWeekEnd.setHours(13, 0, 0, 0);

  const bookingPendingBob = await prisma.booking.create({
    data: {
      id: "booking-demo-bob-gpu",
      userId: bob.id,
      resourceId: "res-dgx-compute",
      start: nextWeekStart,
      end: nextWeekEnd,
      purpose: "RESEARCH",
      purposeDetails: "Fine-tuning Llama-3-8B model on campus conversational corpus for thesis",
      status: "PENDING",
      priorityScore: 105.0,
      depositHeld: 30,
    },
  });

  // 5. NOTIFICATIONS:
  // Pre-seeded notifications for alice, bob, carol, dave, eve
  await prisma.notification.createMany({
    data: [
      {
        userId: alice.id,
        type: "WAITLIST_PLACED",
        message: "You are #1 on the waitlist for 'Epilog Fusion Pro 48 Laser Cutter' for tomorrow 10:00 - 14:00.",
        link: `/bookings/${bookingWaitlistedAlice.id}`,
      },
      {
        userId: alice.id,
        type: "INCIDENT_ALERT",
        message: "A condition report incident was flagged on your UltiMaker 3D Printer reservation.",
        link: `/incidents/${damageIncident.id}`,
      },
      {
        userId: bob.id,
        type: "OVERDUE",
        message: "ALERT: Your booking for 'Keysight Infiniium Oscilloscope' is overdue. Please return immediately.",
        link: `/bookings/${bookingOverdue.id}`,
      },
      {
        userId: bob.id,
        type: "BOOKING_SUBMITTED",
        message: "Your booking request for NVIDIA DGX A100 AI Compute Node has been submitted for review.",
        link: `/bookings/${bookingPendingBob.id}`,
      },
      {
        userId: carol.id,
        type: "BOOKING_APPROVED",
        message: "Your booking for 'Epilog Fusion Pro 48 Laser Cutter' for tomorrow 10:00 - 14:00 has been APPROVED.",
        link: `/bookings/${bookingApprovedCarol.id}`,
      },
      {
        userId: dave.id,
        type: "BOOKING_REVIEW_REQUIRED",
        message: "New booking request from Bob Martinez for NVIDIA DGX A100 AI Compute Node awaits your review.",
        link: "/manage",
      },
      {
        userId: eve.id,
        type: "INCIDENT_ALERT",
        message: "Damage incident on UltiMaker 3D Printer requires manager review and penalty assessment.",
        link: `/incidents/${damageIncident.id}`,
      },
    ],
  });

  // 6. AUDIT LOGS:
  // For each booking state change above, create an AuditLog entry
  await prisma.auditLog.createMany({
    data: [
      {
        actorId: bob.id,
        action: "BOOKING_CREATED",
        entityType: "Booking",
        entityId: bookingOverdue.id,
        reason: "User requested reservation for senior capstone ripple measurement.",
        createdAt: overdueStart,
      },
      {
        actorId: dave.id,
        action: "BOOKING_APPROVED",
        entityType: "Booking",
        entityId: bookingOverdue.id,
        reason: "Lab owner approved oscilloscope checkout.",
        createdAt: overdueStart,
      },
      {
        actorId: bob.id,
        action: "BOOKING_CHECKED_IN",
        entityType: "Booking",
        entityId: bookingOverdue.id,
        reason: "User recorded check-in condition report (Rating: 4/5).",
        createdAt: overdueStart,
      },
      {
        actorId: dave.id,
        action: "INCIDENT_REPORTED",
        entityType: "Incident",
        entityId: delayIncident.id,
        reason: "Delay incident opened: equipment overdue by 2 hours.",
        createdAt: overdueEnd,
      },
      {
        actorId: carol.id,
        action: "BOOKING_CREATED",
        entityType: "Booking",
        entityId: bookingApprovedCarol.id,
        reason: "NSF biology grant microfluidic substrate etching reservation requested.",
        createdAt: now,
      },
      {
        actorId: dave.id,
        action: "BOOKING_APPROVED",
        entityType: "Booking",
        entityId: bookingApprovedCarol.id,
        reason: "Approved: high-impact biology research priority.",
        createdAt: now,
      },
      {
        actorId: alice.id,
        action: "BOOKING_WAITLISTED",
        entityType: "Booking",
        entityId: bookingWaitlistedAlice.id,
        reason: "Resource slot contested. Placed on waitlist at position #1 (Priority score: 85.0).",
        createdAt: now,
      },
      {
        actorId: alice.id,
        action: "BOOKING_CREATED",
        entityType: "Booking",
        entityId: bookingReturnedAlice.id,
        reason: "Reservation requested for 3D printer.",
        createdAt: threeDaysAgoStart,
      },
      {
        actorId: dave.id,
        action: "BOOKING_APPROVED",
        entityType: "Booking",
        entityId: bookingReturnedAlice.id,
        reason: "Approved by lab technician.",
        createdAt: threeDaysAgoStart,
      },
      {
        actorId: alice.id,
        action: "BOOKING_CHECKED_IN",
        entityType: "Booking",
        entityId: bookingReturnedAlice.id,
        reason: "User recorded check-in condition report (Rating: 5/5).",
        createdAt: threeDaysAgoStart,
      },
      {
        actorId: alice.id,
        action: "BOOKING_RETURNED",
        entityType: "Booking",
        entityId: bookingReturnedAlice.id,
        reason: "User checked out equipment. Condition dropped to 2/5.",
        createdAt: threeDaysAgoEnd,
      },
      {
        actorId: dave.id,
        action: "INCIDENT_REPORTED",
        entityType: "Incident",
        entityId: damageIncident.id,
        reason: "Damage incident opened: clogged extruder and chipped build plate.",
        createdAt: threeDaysAgoEnd,
      },
      {
        actorId: bob.id,
        action: "BOOKING_CREATED",
        entityType: "Booking",
        entityId: bookingPendingBob.id,
        reason: "Submitted DGX compute request after completing HPC certification.",
        createdAt: now,
      },
      {
        actorId: frank.id,
        action: "CERTIFICATION_VERIFIED",
        entityType: "UserCertification",
        entityId: "cert-bob-hpc",
        reason: "Completed HPC Slurm workload & multi-GPU training workshop.",
        createdAt: now,
      },
    ],
  });

  console.log("Full seed completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
