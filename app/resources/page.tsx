import React from "react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { checkEligibility } from "@/lib/eligibility";
import { sweepOverdue } from "@/lib/overdue";
import { ResourceListClient } from "./ResourceListClient";
import { isStaff } from "@/lib/rbac";

export default async function ResourcesPage() {
  // 1. Run sweep in background on page load
  try {
    await sweepOverdue();
  } catch (err) {
    // Graceful error logging
    console.error("Auto overdue sweep failed on resources page load:", err);
  }

  const session = await getSession();

  // 2. Fetch full user data if logged in
  let currentUser: any = null;
  if (session?.id) {
    currentUser = await prisma.user.findUnique({
      where: { id: session.id },
      include: {
        certifications: {
          include: { training: true },
        },
      },
    });
  }

  // 3. Fetch all active resources with requirements
  const resources = await prisma.resource.findMany({
    where: {
      status: { not: "RETIRED" },
    },
    include: {
      requirements: {
        include: { training: true },
      },
      owner: {
        select: { id: true, name: true, department: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // 4. Compute eligibility map for each resource
  const mappedResources = resources.map((r) => {
    let isEligible = true;
    let missingCerts: string[] = [];

    if (currentUser) {
      const eligibility = checkEligibility(currentUser, r);
      isEligible = eligibility.eligible;
      missingCerts = eligibility.missing;
    }

    return {
      id: r.id,
      name: r.name,
      type: r.type,
      category: r.category,
      location: r.location,
      description: r.description,
      image: r.image,
      department: r.department,
      depositCredits: r.depositCredits,
      creditCostPerHour: r.creditCostPerHour,
      maxHoursPerBooking: r.maxHoursPerBooking,
      status: r.status,
      isEligible,
      missingCerts,
    };
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <ResourceListClient
        resources={mappedResources}
        userRole={session?.role}
        canCreateResource={isStaff(session?.role || "")}
      />
    </div>
  );
}
