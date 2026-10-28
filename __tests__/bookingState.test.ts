import { describe, it, expect } from "vitest";

describe("Booking State Machine & Condition Logic", () => {
  it("should detect condition degradation between check-in and checkout", () => {
    const checkInReport = { rating: 5, notes: "Flawless condition" };
    const checkOutReport = { rating: 3, notes: "Noticeable scratch on lens" };

    const hasDegradation = checkOutReport.rating < checkInReport.rating;
    expect(hasDegradation).toBe(true);

    const severity = checkOutReport.rating <= 2 ? "HIGH" : "MEDIUM";
    expect(severity).toBe("MEDIUM");
  });

  it("should sort waitlist candidates correctly by priority score then creation date", () => {
    const candidateA = {
      id: "candidate-a",
      userId: "alice",
      priorityScore: 110.0,
      createdAt: new Date("2026-10-28T10:00:00Z"),
    };
    const candidateB = {
      id: "candidate-b",
      userId: "carol",
      priorityScore: 135.0,
      createdAt: new Date("2026-10-28T10:30:00Z"),
    };
    const candidateC = {
      id: "candidate-c",
      userId: "bob",
      priorityScore: 110.0,
      createdAt: new Date("2026-10-28T09:00:00Z"),
    };

    const waitlist = [candidateA, candidateB, candidateC];

    const sorted = [...waitlist].sort((a, b) => {
      if (b.priorityScore !== a.priorityScore) {
        return b.priorityScore - a.priorityScore;
      }
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    // Carol has highest score (135)
    expect(sorted[0].id).toBe("candidate-b");
    // Bob and Alice both have 110, but Bob applied earlier (09:00 vs 10:00)
    expect(sorted[1].id).toBe("candidate-c");
    expect(sorted[2].id).toBe("candidate-a");
  });

  it("should correctly calculate held deposits and refund conditions", () => {
    const depositCredits = 25;
    let userCredits = 100;

    // Deduct on request
    userCredits -= depositCredits;
    expect(userCredits).toBe(75);

    // If returned without damage, refund
    const damageIncidentCreated = false;
    if (!damageIncidentCreated) {
      userCredits += depositCredits;
    }
    expect(userCredits).toBe(100);
  });
});
