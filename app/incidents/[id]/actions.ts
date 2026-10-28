"use server";

import { z } from "zod";
import { requireRole, canManageResource } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { resolveIncident } from "@/lib/incidentService";
import { revalidatePath } from "next/cache";

const ResolveIncidentSchema = z.object({
  incidentId: z.string().min(1, "Incident ID is required"),
  resolution: z.string().min(3, "Resolution must be at least 3 characters").max(1000),
  penaltyType: z.enum(["NONE", "STRIKE", "CREDIT_FINE", "SUSPENSION", "FORFEIT_DEPOSIT"]).default("NONE"),
  penaltyCredits: z.coerce.number().min(0).max(500).default(0),
  suspendDays: z.coerce.number().min(0).max(90).default(0),
  depositAction: z.enum(["REFUND", "FORFEIT", "NONE"]).default("NONE"),
});

export async function resolveIncidentAction(formData: FormData) {
  const session = await requireRole(["MANAGER", "ADMIN"]);

  const rawIncidentId = formData.get("incidentId");
  const rawResolution = formData.get("resolution");
  const rawPenaltyType = formData.get("penaltyType");
  const rawPenaltyCredits = formData.get("penaltyCredits");
  const rawSuspendDays = formData.get("suspendDays");
  const rawDepositAction = formData.get("depositAction");

  const parseResult = ResolveIncidentSchema.safeParse({
    incidentId: rawIncidentId,
    resolution: rawResolution,
    penaltyType: rawPenaltyType || "NONE",
    penaltyCredits: rawPenaltyCredits || 0,
    suspendDays: rawSuspendDays || 0,
    depositAction: rawDepositAction || "NONE",
  });

  if (!parseResult.success) {
    return { success: false, error: parseResult.error.issues[0]?.message || "Invalid resolution parameters" };
  }

  const { incidentId, resolution, penaltyType, penaltyCredits, suspendDays, depositAction } = parseResult.data;

  const incident = await prisma.incident.findUnique({
    where: { id: incidentId },
    include: {
      resource: true,
    },
  });

  if (!incident) return { success: false, error: "Incident not found" };

  // Authorization check: Manager must belong to resource department (or Campus/Admin)
  if (!canManageResource(session, incident.resource)) {
    return {
      success: false,
      error: `Forbidden: You are not authorized to manage incidents for ${incident.resource.department} department resources.`,
    };
  }

  const result = await resolveIncident({
    incidentId,
    resolution,
    penaltyType,
    penaltyCredits,
    suspendDays,
    depositAction,
    actorId: session.id,
    actorName: `Manager ${session.name}`,
  });

  if (result.success) {
    revalidatePath(`/incidents/${incidentId}`);
    revalidatePath("/manage");
  }

  return result;
}
