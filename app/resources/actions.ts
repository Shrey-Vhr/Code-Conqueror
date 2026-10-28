"use server";

import { prisma } from "@/lib/prisma";
import { matchResources } from "@/lib/ai";
import { requireAuth } from "@/lib/rbac";

export async function aiSearchResources(query: string) {
  // Authentication required to prevent unauthenticated consumption of OpenAI API credits
  await requireAuth();

  if (!query || query.trim().length === 0) {
    return { success: true, matches: [] };
  }

  // Rate limiting / abuse guard: truncate query to reasonable length
  const safeQuery = query.trim().slice(0, 200);

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

  const matches = await matchResources(safeQuery, allResources);
  return { success: true, matches };
}
