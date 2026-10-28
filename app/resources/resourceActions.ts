"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, canManageResource, isStaff } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

const ResourceInputSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  type: z.enum(["EQUIPMENT", "SPACE", "TOOL", "COMPUTE", "MAKERSPACE", "VEHICLE", "OTHER"]),
  category: z.string().min(2, "Category is required").max(50),
  department: z.string().min(2, "Department is required").max(50).optional(),
  location: z.string().min(2, "Location is required").max(100),
  description: z.string().min(5, "Description must be at least 5 characters").max(2000),
  rules: z.string().max(2000).optional().default(""),
  image: z.string().optional().default(""),
  status: z.enum(["ACTIVE", "MAINTENANCE", "RETIRED"]).default("ACTIVE"),
  requiresSupervision: z.boolean().default(false),
  depositCredits: z.coerce.number().min(0).max(500).default(0),
  creditCostPerHour: z.coerce.number().min(0).max(100).default(0),
  maxHoursPerBooking: z.coerce.number().min(1).max(72).default(4),
  maxBookingsPerWeek: z.coerce.number().min(1).max(20).default(3),
  trainingId: z.string().nullable().optional(),
  requiredRole: z.string().nullable().optional(),
  requiredDepartment: z.string().nullable().optional(),
  minCredits: z.coerce.number().min(0).max(1000).nullable().optional(),
  availabilityWindows: z.string().optional(),
});

export async function createResourceAction(formData: FormData) {
  const session = await requireAuth();

  // Role check: Only staff, owners, managers, and admins can list resources
  if (!isStaff(session.role)) {
    return {
      success: false,
      error: "Forbidden: Only faculty, lab staff, owners, or administrators can list shared campus resources.",
    };
  }

  const rawData = {
    name: formData.get("name"),
    type: formData.get("type"),
    category: formData.get("category"),
    department: formData.get("department") || session.department,
    location: formData.get("location"),
    description: formData.get("description"),
    rules: formData.get("rules") || "",
    image: formData.get("image") || "",
    requiresSupervision: formData.get("requiresSupervision") === "on",
    depositCredits: formData.get("depositCredits") || 0,
    creditCostPerHour: formData.get("creditCostPerHour") || 0,
    maxHoursPerBooking: formData.get("maxHoursPerBooking") || 4,
    maxBookingsPerWeek: formData.get("maxBookingsPerWeek") || 3,
    trainingId: (formData.get("trainingId") as string) || null,
    requiredRole: (formData.get("requiredRole") as string) || null,
    requiredDepartment: (formData.get("requiredDepartment") as string) || null,
    minCredits: formData.get("minCredits") ? parseInt(formData.get("minCredits") as string, 10) : null,
    availabilityWindows: (formData.get("availabilityWindows") as string) || undefined,
  };

  const parseResult = ResourceInputSchema.safeParse(rawData);
  if (!parseResult.success) {
    return { success: false, error: parseResult.error.issues[0]?.message || "Invalid resource data" };
  }

  const data = parseResult.data;

  // Department gating: Only ADMIN can set an arbitrary department; others are locked to their own department
  const effectiveDepartment = session.role === "ADMIN" && data.department ? data.department : session.department;

  const defaultAvailability = JSON.stringify([
    { dayOfWeek: 1, start: "08:00", end: "20:00" },
    { dayOfWeek: 2, start: "08:00", end: "20:00" },
    { dayOfWeek: 3, start: "08:00", end: "20:00" },
    { dayOfWeek: 4, start: "08:00", end: "20:00" },
    { dayOfWeek: 5, start: "08:00", end: "20:00" },
  ]);

  let availability = defaultAvailability;
  if (data.availabilityWindows) {
    try {
      const parsed = JSON.parse(data.availabilityWindows);
      if (!Array.isArray(parsed)) {
        return { success: false, error: "Availability schedule must be a JSON array of daily operating windows." };
      }
      availability = data.availabilityWindows;
    } catch {
      return { success: false, error: "Invalid availability schedule: Please provide valid JSON format or use default schedule." };
    }
  }

  try {
    const resource = await prisma.$transaction(async (tx) => {
      const res = await tx.resource.create({
        data: {
          name: data.name,
          type: data.type,
          category: data.category,
          department: effectiveDepartment,
          location: data.location,
          description: data.description,
          rules: data.rules,
          image: data.image || null,
          ownerId: session.id,
          requiresSupervision: data.requiresSupervision,
          depositCredits: data.depositCredits,
          creditCostPerHour: data.creditCostPerHour,
          maxHoursPerBooking: data.maxHoursPerBooking,
          maxBookingsPerWeek: data.maxBookingsPerWeek,
          status: "ACTIVE",
          availabilityWindows: availability,
        },
      });

      // Handle multiple distinct requirements
      if (data.trainingId) {
        await tx.resourceRequirement.create({
          data: { resourceId: res.id, trainingId: data.trainingId },
        });
      }
      if (data.requiredRole) {
        await tx.resourceRequirement.create({
          data: { resourceId: res.id, requiredRole: data.requiredRole },
        });
      }
      if (data.requiredDepartment) {
        await tx.resourceRequirement.create({
          data: { resourceId: res.id, requiredDepartment: data.requiredDepartment },
        });
      }
      if (data.minCredits !== null && data.minCredits !== undefined && data.minCredits > 0) {
        await tx.resourceRequirement.create({
          data: { resourceId: res.id, minCredits: data.minCredits },
        });
      }

      await audit(tx, {
        actorId: session.id,
        action: "RESOURCE_CREATED",
        entityType: "Resource",
        entityId: res.id,
        after: { name: data.name, type: data.type, department: effectiveDepartment },
        reason: "Owner listed new resource for campus sharing",
      });

      return res;
    });

    revalidatePath("/resources");
    return { success: true, resourceId: resource.id };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to create resource." };
  }
}

export async function updateResourceAction(id: string, formData: FormData) {
  const session = await requireAuth();

  const existing = await prisma.resource.findUnique({
    where: { id },
    include: { requirements: true },
  });

  if (!existing) return { success: false, error: "Resource not found" };

  if (!canManageResource(session, { ownerId: existing.ownerId, department: existing.department })) {
    return { success: false, error: "Forbidden: You are not authorized to edit this resource." };
  }

  const rawData = {
    name: formData.get("name"),
    type: formData.get("type"),
    category: formData.get("category"),
    department: formData.get("department") || existing.department,
    location: formData.get("location"),
    description: formData.get("description"),
    rules: formData.get("rules") || "",
    image: formData.get("image") || "",
    status: formData.get("status") || existing.status,
    requiresSupervision: formData.get("requiresSupervision") === "on",
    depositCredits: formData.get("depositCredits") || 0,
    creditCostPerHour: formData.get("creditCostPerHour") || 0,
    maxHoursPerBooking: formData.get("maxHoursPerBooking") || 4,
    maxBookingsPerWeek: formData.get("maxBookingsPerWeek") || 3,
    trainingId: (formData.get("trainingId") as string) || null,
    requiredRole: (formData.get("requiredRole") as string) || null,
    requiredDepartment: (formData.get("requiredDepartment") as string) || null,
    minCredits: formData.get("minCredits") ? parseInt(formData.get("minCredits") as string, 10) : null,
    availabilityWindows: (formData.get("availabilityWindows") as string) || undefined,
  };

  const parseResult = ResourceInputSchema.safeParse(rawData);
  if (!parseResult.success) {
    return { success: false, error: parseResult.error.issues[0]?.message || "Invalid resource data" };
  }

  const data = parseResult.data;

  // Non-admins cannot transfer resource outside their department
  const effectiveDepartment =
    session.role === "ADMIN" && data.department ? data.department : existing.department;

  let availability = existing.availabilityWindows;
  if (data.availabilityWindows) {
    try {
      const parsed = JSON.parse(data.availabilityWindows);
      if (!Array.isArray(parsed)) {
        return { success: false, error: "Availability schedule must be a JSON array of daily operating windows." };
      }
      availability = data.availabilityWindows;
    } catch {
      return { success: false, error: "Invalid availability schedule: Please provide valid JSON format or leave unchanged." };
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.resource.update({
        where: { id },
        data: {
          name: data.name,
          type: data.type,
          category: data.category,
          department: effectiveDepartment,
          location: data.location,
          description: data.description,
          rules: data.rules,
          image: data.image || null,
          status: data.status,
          requiresSupervision: data.requiresSupervision,
          depositCredits: data.depositCredits,
          creditCostPerHour: data.creditCostPerHour,
          maxHoursPerBooking: data.maxHoursPerBooking,
          maxBookingsPerWeek: data.maxBookingsPerWeek,
          availabilityWindows: availability,
        },
      });

      // Update requirements: preserve existing unless explicitly updated
      await tx.resourceRequirement.deleteMany({
        where: { resourceId: id },
      });

      const trainingId =
        data.trainingId !== undefined
          ? data.trainingId
          : existing.requirements.find((r) => r.trainingId)?.trainingId;
      const requiredRole =
        data.requiredRole !== undefined
          ? data.requiredRole
          : existing.requirements.find((r) => r.requiredRole)?.requiredRole;
      const requiredDepartment =
        data.requiredDepartment !== undefined
          ? data.requiredDepartment
          : existing.requirements.find((r) => r.requiredDepartment)?.requiredDepartment;
      const minCredits =
        data.minCredits !== undefined
          ? data.minCredits
          : existing.requirements.find((r) => r.minCredits !== null)?.minCredits;

      if (trainingId) {
        await tx.resourceRequirement.create({
          data: { resourceId: id, trainingId },
        });
      }
      if (requiredRole) {
        await tx.resourceRequirement.create({
          data: { resourceId: id, requiredRole },
        });
      }
      if (requiredDepartment) {
        await tx.resourceRequirement.create({
          data: { resourceId: id, requiredDepartment },
        });
      }
      if (minCredits !== null && minCredits !== undefined && minCredits > 0) {
        await tx.resourceRequirement.create({
          data: { resourceId: id, minCredits },
        });
      }

      await audit(tx, {
        actorId: session.id,
        action: "RESOURCE_UPDATED",
        entityType: "Resource",
        entityId: id,
        before: { status: existing.status, name: existing.name },
        after: { status: data.status, name: data.name },
        reason: "Resource details updated by manager/owner",
      });
    });

    revalidatePath(`/resources/${id}`);
    revalidatePath("/resources");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update resource." };
  }
}
