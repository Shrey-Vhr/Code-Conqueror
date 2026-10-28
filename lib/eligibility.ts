import { prisma } from "./prisma";

export interface UserForEligibility {
  id: string;
  role: string;
  department: string;
  verified: boolean;
  emailVerified: boolean;
  credits: number;
  strikes: number;
  suspendedUntil?: Date | string | null;
  certifications?: Array<{
    trainingId: string;
    status: string;
    expiresAt?: Date | string | null;
    training?: { name: string; code: string };
  }>;
}

export interface ResourceForEligibility {
  id: string;
  name: string;
  department: string;
  depositCredits: number;
  creditCostPerHour: number;
  requirements?: Array<{
    id?: string;
    trainingId?: string | null;
    requiredRole?: string | null;
    requiredDepartment?: string | null;
    minCredits?: number | null;
    training?: { id: string; name: string; code: string } | null;
  }>;
}

export interface EligibilityResult {
  eligible: boolean;
  met: string[];
  missing: string[];
  details: {
    accountVerified: boolean;
    notSuspended: boolean;
    creditsSufficient: boolean;
    roleMet: boolean;
    departmentMet: boolean;
    trainingsMet: boolean;
  };
}

export function checkEligibility(
  user: UserForEligibility,
  resource: ResourceForEligibility
): EligibilityResult {
  const met: string[] = [];
  const missing: string[] = [];

  // 1. Account verification
  const isAccountVerified = Boolean(user.verified);
  if (isAccountVerified) {
    met.push("Verified campus member (admin verified)");
  } else {
    missing.push("Unverified account: must be verified by admin");
  }

  // 2. Suspension check
  const isSuspended =
    user.suspendedUntil && new Date(user.suspendedUntil) > new Date();
  const notSuspended = !isSuspended && (user.strikes ?? 0) < 3;
  if (notSuspended) {
    met.push("Account in good standing (no active suspension)");
  } else {
    missing.push(
      isSuspended
        ? `Account suspended until ${new Date(user.suspendedUntil!).toLocaleDateString()}`
        : "Account suspended due to 3 or more strikes"
    );
  }

  // 3. Credits check
  const requiredCredits = Math.max(
    resource.depositCredits || 0,
    resource.creditCostPerHour || 0
  );
  let creditsSufficient = (user.credits ?? 0) >= requiredCredits;
  if (creditsSufficient) {
    met.push(
      `Sufficient credit balance (${user.credits} available, ${requiredCredits} required)`
    );
  } else {
    missing.push(
      `Insufficient credits (${user.credits} available, ${requiredCredits} required for deposit/first hour)`
    );
  }

  // 4. Role & Department & Training requirements
  let roleMet = true;
  let departmentMet = true;
  let trainingsMet = true;
  let minCreditsMet = true;

  const requirements = resource.requirements || [];

  for (const req of requirements) {
    // Role check
    if (req.requiredRole) {
      if (
        user.role === req.requiredRole ||
        user.role === "ADMIN" ||
        user.role === "MANAGER"
      ) {
        met.push(`Meets role requirement: ${req.requiredRole}`);
      } else {
        roleMet = false;
        missing.push(
          `Requires role: ${req.requiredRole} (your role: ${user.role})`
        );
      }
    }

    // Department check
    if (req.requiredDepartment) {
      if (
        user.department === req.requiredDepartment ||
        user.role === "ADMIN" ||
        user.department === "Campus"
      ) {
        met.push(`Department match: ${req.requiredDepartment}`);
      } else {
        departmentMet = false;
        missing.push(
          `Priority/restricted to department: ${req.requiredDepartment} (your department: ${user.department})`
        );
      }
    }

    // Min credits check
    if (req.minCredits && req.minCredits > 0) {
      if ((user.credits ?? 0) >= req.minCredits) {
        met.push(`Meets minimum credit balance of ${req.minCredits}`);
      } else {
        minCreditsMet = false;
        creditsSufficient = false;
        missing.push(
          `Requires minimum ${req.minCredits} credits (you have ${user.credits})`
        );
      }
    }

    // Training / Certification check
    if (req.trainingId) {
      const userCerts = user.certifications || [];
      const cert = userCerts.find(
        (c) =>
          c.trainingId === req.trainingId &&
          c.status === "VERIFIED" &&
          (!c.expiresAt || new Date(c.expiresAt) > new Date())
      );

      const trainingName = req.training?.name || `Training #${req.trainingId}`;
      if (cert) {
        met.push(`Certified: ${trainingName}`);
      } else {
        trainingsMet = false;
        const pending = userCerts.find(
          (c) => c.trainingId === req.trainingId && c.status === "PENDING"
        );
        if (pending) {
          missing.push(`Certification pending approval: ${trainingName}`);
        } else {
          missing.push(`Missing mandatory certification: ${trainingName}`);
        }
      }
    }
  }

  const eligible =
    isAccountVerified &&
    notSuspended &&
    creditsSufficient &&
    minCreditsMet &&
    roleMet &&
    departmentMet &&
    trainingsMet;

  return {
    eligible,
    met,
    missing,
    details: {
      accountVerified: isAccountVerified,
      notSuspended,
      creditsSufficient,
      roleMet,
      departmentMet,
      trainingsMet,
    },
  };
}

export async function checkUserEligibilityForResource(
  userId: string,
  resourceId: string
): Promise<EligibilityResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      certifications: {
        include: {
          training: true,
        },
      },
    },
  });

  const resource = await prisma.resource.findUnique({
    where: { id: resourceId },
    include: {
      requirements: {
        include: {
          training: true,
        },
      },
    },
  });

  if (!user || !resource) {
    return {
      eligible: false,
      met: [],
      missing: ["User or resource not found"],
      details: {
        accountVerified: false,
        notSuspended: false,
        creditsSufficient: false,
        roleMet: false,
        departmentMet: false,
        trainingsMet: false,
      },
    };
  }

  return checkEligibility(user, resource);
}
