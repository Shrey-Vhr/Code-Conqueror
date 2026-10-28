import { describe, it, expect } from "vitest";
import { computePriorityScore } from "@/lib/fairness";

describe("Fairness Priority Scoring Engine", () => {
  it("should calculate base priority score correctly for fresh user", () => {
    const result = computePriorityScore({
      recentHours30d: 0,
      purpose: "PERSONAL",
      strikes: 0,
      role: "STUDENT",
    });

    // 100 base + 0 usage + 0 purpose - 0 strikes + 10 role = 110
    expect(result.baseScore).toBe(100);
    expect(result.recentUsagePenalty).toBe(0);
    expect(result.purposeBonus).toBe(0);
    expect(result.finalScore).toBe(110);
  });

  it("should award higher priority bonus for funded research and coursework", () => {
    const research = computePriorityScore({
      recentHours30d: 0,
      purpose: "RESEARCH",
      strikes: 0,
      role: "RESEARCHER",
    });

    const coursework = computePriorityScore({
      recentHours30d: 0,
      purpose: "COURSEWORK",
      strikes: 0,
      role: "STUDENT",
    });

    // Research: 100 + 25 + 15 = 140
    expect(research.purposeBonus).toBe(25);
    expect(research.finalScore).toBe(140);

    // Coursework: 100 + 20 + 10 = 130
    expect(coursework.purposeBonus).toBe(20);
    expect(coursework.finalScore).toBe(130);
  });

  it("should penalize high recent equipment usage in the past 30 days", () => {
    const heavyUser = computePriorityScore({
      recentHours30d: 20, // 20 hours * 2.5 = 50 penalty
      purpose: "COURSEWORK",
      strikes: 0,
      role: "STUDENT",
    });

    expect(heavyUser.recentUsagePenalty).toBe(50);
    // 100 - 50 + 20 + 10 = 80
    expect(heavyUser.finalScore).toBe(80);
  });

  it("should deduct severe points for accumulated conduct strikes", () => {
    const strikeUser = computePriorityScore({
      recentHours30d: 0,
      purpose: "COURSEWORK",
      strikes: 2, // 2 strikes * 25 = 50 penalty
      role: "STUDENT",
    });

    expect(strikeUser.strikesPenalty).toBe(50);
    // 100 - 0 + 20 - 50 + 10 = 80
    expect(strikeUser.finalScore).toBe(80);
  });

  it("should add bonus points for time spent on waitlist", () => {
    const waitingUser = computePriorityScore({
      recentHours30d: 0,
      hoursWaiting: 10, // 10 * 2 = 20 bonus
      purpose: "COURSEWORK",
      strikes: 0,
      role: "STUDENT",
    });

    expect(waitingUser.waitlistAgeBonus).toBe(20);
    // 100 + 20 (waitlist) + 20 (coursework) + 10 (role) = 150
    expect(waitingUser.finalScore).toBe(150);
  });
});
