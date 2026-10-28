import { describe, it, expect } from "vitest";
import { checkTimeOverlap, isWithinAvailabilityWindows } from "@/lib/conflicts";

describe("Time & Operating Conflict Engine", () => {
  it("should accurately identify overlapping time windows", () => {
    const startA = new Date("2026-10-30T10:00:00Z");
    const endA = new Date("2026-10-30T12:00:00Z");

    const startB = new Date("2026-10-30T11:00:00Z");
    const endB = new Date("2026-10-30T13:00:00Z");

    expect(checkTimeOverlap(startA, endA, startB, endB)).toBe(true);
  });

  it("should allow adjacent non-overlapping booking slots", () => {
    const startA = new Date("2026-10-30T10:00:00Z");
    const endA = new Date("2026-10-30T12:00:00Z");

    const startB = new Date("2026-10-30T12:00:00Z");
    const endB = new Date("2026-10-30T14:00:00Z");

    expect(checkTimeOverlap(startA, endA, startB, endB)).toBe(false);
  });

  it("should validate booking falls strictly within operating availability windows", () => {
    // Windows for Monday (day 1) from 08:00 to 20:00
    const windowsJson = JSON.stringify([
      { dayOfWeek: 1, start: "08:00", end: "20:00" },
    ]);

    // Monday 10:00 to 12:00
    const validStart = new Date("2026-11-02T10:00:00"); // 2026-11-02 is Monday
    const validEnd = new Date("2026-11-02T12:00:00");

    const validCheck = isWithinAvailabilityWindows(validStart, validEnd, windowsJson);
    expect(validCheck.valid).toBe(true);

    // Monday 06:00 to 09:00 (too early)
    const earlyStart = new Date("2026-11-02T06:00:00");
    const earlyEnd = new Date("2026-11-02T09:00:00");
    const earlyCheck = isWithinAvailabilityWindows(earlyStart, earlyEnd, windowsJson);
    expect(earlyCheck.valid).toBe(false);
    expect(earlyCheck.reason).toContain("outside open operating hours");

    // Sunday (day 0) when only Monday is open
    const sundayStart = new Date("2026-11-01T10:00:00");
    const sundayEnd = new Date("2026-11-01T12:00:00");
    const sundayCheck = isWithinAvailabilityWindows(sundayStart, sundayEnd, windowsJson);
    expect(sundayCheck.valid).toBe(false);
    expect(sundayCheck.reason).toContain("not available on Sundays");
  });

  it("should reject multi-day cross-midnight reservations", () => {
    const windowsJson = JSON.stringify([
      { dayOfWeek: 1, start: "08:00", end: "20:00" },
    ]);
    const start = new Date("2026-11-02T18:00:00");
    const end = new Date("2026-11-03T02:00:00");

    const check = isWithinAvailabilityWindows(start, end, windowsJson);
    expect(check.valid).toBe(false);
    expect(check.reason).toContain("cannot span across multiple calendar days");
  });
});
