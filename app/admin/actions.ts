"use server";

import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { addDays } from "date-fns";
import { revalidatePath } from "next/cache";

export async function verifyCertificationAction(
  certId: string,
  approved: boolean
) {
  const session = await requireRole(["ADMIN"]);

  const cert = await prisma.userCertification.findUnique({
    where: { id: certId },
    include: { user: true, training: true },
  });

  if (!cert) return { success: false, error: "Certification request not found" };

  return await prisma.$transaction(async (tx) => {
    if (approved) {
      const expiresAt = addDays(new Date(), cert.training.validDurationDays);

      await tx.userCertification.update({
        where: { id: certId },
        data: {
          status: "VERIFIED",
          expiresAt,
          verifiedById: session.id,
        },
      });

      await audit(tx, {
        actorId: session.id,
        action: "CERTIFICATION_VERIFIED",
        entityType: "UserCertification",
        entityId: certId,
        before: { status: "PENDING" },
        after: { status: "VERIFIED", expiresAt: expiresAt.toISOString() },
        reason: `Admin verified credentials for ${cert.training.name}`,
      });

      await createNotification(tx, {
        userId: cert.userId,
        type: "CERTIFICATION_VERIFIED",
        message: `Your training certification for "${cert.training.name}" has been VERIFIED. You can now reserve equipment requiring this safety credential!`,
        link: "/profile",
      });
    } else {
      await tx.userCertification.update({
        where: { id: certId },
        data: { status: "EXPIRED" },
      });

      await audit(tx, {
        actorId: session.id,
        action: "CERTIFICATION_REJECTED",
        entityType: "UserCertification",
        entityId: certId,
        before: { status: "PENDING" },
        after: { status: "EXPIRED" },
        reason: `Admin rejected certification submission`,
      });

      await createNotification(tx, {
        userId: cert.userId,
        type: "CERTIFICATION_REJECTED",
        message: `Your submitted documentation for "${cert.training.name}" was not verified. Please contact lab safety.`,
        link: "/profile",
      });
    }

    revalidatePath("/admin");
    revalidatePath("/profile");
    return { success: true };
  });
}

export async function createTrainingAction(formData: FormData) {
  const session = await requireRole(["ADMIN"]);

  const name = formData.get("name") as string;
  const code = formData.get("code") as string;
  const department = formData.get("department") as string;
  const description = formData.get("description") as string;
  const validDurationDays = parseInt(formData.get("validDurationDays") as string, 10) || 365;

  if (!name || !code || !department) {
    return { success: false, error: "Please fill in all required training fields." };
  }

  const training = await prisma.training.create({
    data: {
      name,
      code: code.toUpperCase(),
      department,
      description: description || "University laboratory safety standard",
      validDurationDays,
    },
  });

  await audit(prisma, {
    actorId: session.id,
    action: "TRAINING_CREATED",
    entityType: "Training",
    entityId: training.id,
    after: { name, code },
    reason: `Created new campus training module`,
  });

  revalidatePath("/admin");
  return { success: true, trainingId: training.id };
}
