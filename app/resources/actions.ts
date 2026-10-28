"use server";

import { prisma } from "@/lib/prisma";
import { matchResources } from "@/lib/ai";

export async function aiSearchResources(query: string) {
  if (!query || query.trim().length === 0) {
    return { success: true, matches: [] };
  }

  const allResources = await prisma.resource.findMany({
    where: { status: { not: "RETIRED" } },
    select: {
      id: true,
      name: true,
      type: true,
      category: true,
      department: true,
      description: true,
      location: true,
    },
  });

  const matches = await matchResources(query, allResources);
  return { success: true, matches };
}
