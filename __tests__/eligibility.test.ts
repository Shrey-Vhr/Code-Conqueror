import { describe, it, expect } from "vitest";
import { checkEligibility } from "@/lib/eligibility";

describe("Eligibility Rules Engine", () => {
  const baseUser = {
    id: "user-1",
    role: "STUDENT",
    department: "Engineering",
    verified: true,
    emailVerified: true,
    credits: 100,
    strikes: 0,
    certifications: [
      {
        trainingId: "laser-safety-101",
        status: "VERIFIED",
        expiresAt: new Date(Date.now() + 86400000 * 30),
      },
    ],
  };

  const baseResource = {
    id: "res-laser-1",
    name: "Epilog Laser Cutter",
    department: "Engineering",
    depositCredits: 20,
    creditCostPerHour: 10,
    requirements: [
      {
        trainingId: "laser-safety-101",
        training: { id: "laser-safety-101", name: "Laser Safety 101", code: "ENG-01" },
      },
    ],
  };

  it("should approve an eligible user meeting all certifications and credits", () => {
    const result = checkEligibility(baseUser, baseResource);
    expect(result.eligible).toBe(true);
    expect(result.missing.length).toBe(0);
    expect(result.details.trainingsMet).toBe(true);
    expect(result.details.creditsSufficient).toBe(true);
  });

  it("should fail if user is missing the required training certification", () => {
    const userWithoutCert = {
      ...baseUser,
      certifications: [],
    };
    const result = checkEligibility(userWithoutCert, baseResource);
    expect(result.eligible).toBe(false);
    expect(result.details.trainingsMet).toBe(false);
    expect(result.missing.some((m) => m.includes("Missing mandatory certification"))).toBe(true);
  });

  it("should fail if user's certification has expired", () => {
    const userWithExpiredCert = {
      ...baseUser,
      certifications: [
        {
          trainingId: "laser-safety-101",
          status: "VERIFIED",
          expiresAt: new Date(Date.now() - 100000), // in the past
        },
      ],
    };
    const result = checkEligibility(userWithExpiredCert, baseResource);
    expect(result.eligible).toBe(false);
    expect(result.details.trainingsMet).toBe(false);
  });

  it("should fail if user has insufficient credits for deposit and first hour", () => {
    const userLowCredits = {
      ...baseUser,
      credits: 5, // needs at least 20
    };
    const result = checkEligibility(userLowCredits, baseResource);
    expect(result.eligible).toBe(false);
    expect(result.details.creditsSufficient).toBe(false);
  });

  it("should fail if user has active suspension or 3+ strikes", () => {
    const suspendedUser = {
      ...baseUser,
      suspendedUntil: new Date(Date.now() + 86400000 * 7),
    };
    const resultSuspended = checkEligibility(suspendedUser, baseResource);
    expect(resultSuspended.eligible).toBe(false);
    expect(resultSuspended.details.notSuspended).toBe(false);

    const strikeUser = {
      ...baseUser,
      strikes: 3,
    };
    const resultStrikes = checkEligibility(strikeUser, baseResource);
    expect(resultStrikes.eligible).toBe(false);
    expect(resultStrikes.details.notSuspended).toBe(false);
  });

  it("should enforce role prerequisites when specified", () => {
    const restrictedResource = {
      ...baseResource,
      requirements: [
        {
          requiredRole: "RESEARCHER",
        },
      ],
    };

    const studentResult = checkEligibility(baseUser, restrictedResource);
    expect(studentResult.eligible).toBe(false);
    expect(studentResult.details.roleMet).toBe(false);

    const researcherUser = {
      ...baseUser,
      role: "RESEARCHER",
    };
    const researcherResult = checkEligibility(researcherUser, restrictedResource);
    expect(researcherResult.eligible).toBe(true);
    expect(researcherResult.details.roleMet).toBe(true);
  });
});
