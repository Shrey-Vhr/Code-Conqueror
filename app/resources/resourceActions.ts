"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { canManageResource } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function createResourceAction(formData: FormData) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  try {
    const name = formData.get("name") as string;
    const type = formData.get("type") as string;
    const category = formData.get("category") as string;
    const department = formData.get("department") as string;
    const location = formData.get("location") as string;
    const description = formData.get("description") as string;
    const rules = formData.get("rules") as string;
    const image = formData.get("image") as string;
    const requiresSupervision = formData.get("requiresSupervision") === "on";
    const depositCredits = parseInt(formData.get("depositCredits") as string, 10) || 0;
    const creditCostPerHour = parseInt(formData.get("creditCostPerHour") as string, 10) || 0;
    const maxHoursPerBooking = parseInt(formData.get("maxHoursPerBooking") as string, 10) || 4;
    const maxBookingsPerWeek = parseInt(formData.get("maxBookingsPerWeek") as string, 10) || 3;
    const trainingId = (formData.get("trainingId") as string) || null;
    const requiredRole = (formData.get("requiredRole") as string) || null;

    if (!name || !type || !category || !location || !description) {
      return { success: false, error: "Please fill in all required fields." };
    }

    const defaultAvailability = JSON.stringify([
      { dayOfWeek: 1, start: "08:00", end: "20:00" },
      { dayOfWeek: 2, start: "08:00", end: "20:00" },
      { dayOfWeek: 3, start: "08:00", end: "20:00" },
      { dayOfWeek: 4, start: "08:00", end: "20:00" },
      { dayOfWeek: 5, start: "08:00", end: "20:00" },
    ]);

    const resource = await prisma.$transaction(async (tx) => {
      const res = await tx.resource.create({
        data: {
          name,
          type,
          category,
          department: department || session.department,
          location,
          description,
          rules,
          image: image || null,
          ownerId: session.id,
          requiresSupervision,
          depositCredits,
          creditCostPerHour,
          maxHoursPerBooking,
          maxBookingsPerWeek,
          status: "ACTIVE",
          availabilityWindows: defaultAvailability,
        },
      });

      if (trainingId || requiredRole) {
        await tx.resourceRequirement.create({
          data: {
            resourceId: res.id,
            trainingId: trainingId || null,
            requiredRole: requiredRole || null,
          },
        });
      }

      await audit(tx, {
        actorId: session.id,
        action: "RESOURCE_CREATED",
        entityType: "Resource",
        entityId: res.id,
        after: { name, type, department: res.department },
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
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const existing = await prisma.resource.findUnique({
    where: { id },
  });

  if (!existing) return { success: false, error: "Resource not found" };

  if (!canManageResource(session, { ownerId: existing.ownerId, department: existing.department })) {
    return { success: false, error: "Forbidden: You are not authorized to edit this resource." };
  }

  try {
    const name = formData.get("name") as string;
    const type = formData.get("type") as string;
    const category = formData.get("category") as string;
    const department = formData.get("department") as string;
    const location = formData.get("location") as string;
    const description = formData.get("description") as string;
    const rules = formData.get("rules") as string;
    const image = formData.get("image") as string;
    const status = formData.get("status") as string;
    const requiresSupervision = formData.get("requiresSupervision") === "on";
    const depositCredits = parseInt(formData.get("depositCredits") as string, 10) || 0;
    const creditCostPerHour = parseInt(formData.get("creditCostPerHour") as string, 10) || 0;
    const maxHoursPerBooking = parseInt(formData.get("maxHoursPerBooking") as string, 10) || 4;
    const maxBookingsPerWeek = parseInt(formData.get("maxBookingsPerWeek") as string, 10) || 3;
    const trainingId = (formData.get("trainingId") as string) || null;
    const requiredRole = (formData.get("requiredRole") as string) || null;

    await prisma.$transaction(async (tx) => {
      await tx.resource.update({
        where: { id },
        data: {
          name,
          type,
          category,
          department,
          location,
          description,
          rules,
          image: image || null,
          status,
          requiresSupervision,
          depositCredits,
          creditCostPerHour,
          maxHoursPerBooking,
          maxBookingsPerWeek,
        },
      });

      // Update requirement
      await tx.resourceRequirement.deleteMany({
        where: { resourceId: id },
      });

      if (trainingId || requiredRole) {
        await tx.resourceRequirement.create({
          data: {
            resourceId: id,
            trainingId: trainingId || null,
            requiredRole: requiredRole || null,
          },
        });
      }

      await audit(tx, {
        actorId: session.id,
        action: "RESOURCE_UPDATED",
        entityType: "Resource",
        entityId: id,
        before: { status: existing.status, name: existing.name },
        after: { status, name },
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
