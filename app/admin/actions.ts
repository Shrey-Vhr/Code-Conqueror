"use server";

import { z } from "zod";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { addDays } from "date-fns";
import { revalidatePath } from "next/cache";

const VerifyCertSchema = z.object({
  certId: z.string().min(1, "Certification ID is required"),
  approved: z.boolean(),
});

const VerifyUserSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  verified: z.boolean(),
});

const FairnessSettingSchema = z.object({
  key: z.string().min(1, "Setting key is required"),
  value: z.string().min(1, "Setting value is required"),
});

const CreateTrainingSchema = z.object({
  name: z.string().min(3, "Training name must be at least 3 characters"),
  code: z.string().min(2, "Code must be at least 2 characters").max(20),
  department: z.string().min(2, "Department is required"),
  description: z.string().max(1000).optional().default(""),
  validDurationDays: z.coerce.number().min(1).max(1825).default(365),
});

export async function verifyCertificationAction(
  certId: string,
  approved: boolean
) {
  const session = await requireRole(["ADMIN"]);

  const parseResult = VerifyCertSchema.safeParse({ certId, approved });
  if (!parseResult.success) {
    return { success: false, error: parseResult.error.issues[0]?.message || "Invalid input" };
  }

  const cert = await prisma.userCertification.findUnique({
    where: { id: parseResult.data.certId },
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
        data: { status: "REJECTED" },
      });

      await audit(tx, {
        actorId: session.id,
        action: "CERTIFICATION_REJECTED",
        entityType: "UserCertification",
        entityId: certId,
        before: { status: "PENDING" },
        after: { status: "REJECTED" },
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

export async function verifyUserAccountAction(userId: string, verified: boolean) {
  const session = await requireRole(["ADMIN"]);

  const parseResult = VerifyUserSchema.safeParse({ userId, verified });
  if (!parseResult.success) {
    return { success: false, error: parseResult.error.issues[0]?.message || "Invalid input" };
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { success: false, error: "User not found" };

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { verified },
    });

    await audit(tx, {
      actorId: session.id,
      action: verified ? "USER_VERIFIED" : "USER_UNVERIFIED",
      entityType: "User",
      entityId: userId,
      before: { verified: user.verified },
      after: { verified },
      reason: `Account verification status updated by Admin ${session.name}`,
    });

    await createNotification(tx, {
      userId,
      type: "ACCOUNT_VERIFIED",
      message: verified
        ? "Your campus account has been officially verified by Administration. You now have full reservation access."
        : "Your account verification status was revoked by Administration. Please contact administration.",
      link: "/profile",
    });
  });

  revalidatePath("/admin");
  return { success: true };
}

export async function updateFairnessSettingAction(key: string, value: string) {
  const session = await requireRole(["ADMIN"]);

  const parseResult = FairnessSettingSchema.safeParse({ key, value });
  if (!parseResult.success) {
    return { success: false, error: parseResult.error.issues[0]?.message || "Invalid setting parameter" };
  }

  const existing = await prisma.fairnessSetting.findUnique({ where: { id: "default" } });

  const numVal = parseFloat(value);
  if (isNaN(numVal)) {
    return { success: false, error: "Value must be a valid number" };
  }

  const updateData: any = {};
  if (["weeklyHourCap", "monthlyCreditGrant"].includes(key)) {
    updateData[key] = Math.round(numVal);
  } else {
    updateData[key] = numVal;
  }

  await prisma.$transaction(async (tx) => {
    await tx.fairnessSetting.upsert({
      where: { id: "default" },
      update: updateData,
      create: { id: "default", ...updateData },
    });

    await audit(tx, {
      actorId: session.id,
      action: "FAIRNESS_SETTING_UPDATED",
      entityType: "FairnessSetting",
      entityId: "default",
      before: existing ? { [key]: (existing as any)[key] } : null,
      after: { [key]: numVal },
      reason: `Admin updated policy parameter "${key}" to "${value}"`,
    });
  });

  revalidatePath("/admin");
  return { success: true };
}

export async function createTrainingAction(formData: FormData) {
  const session = await requireRole(["ADMIN"]);

  const rawData = {
    name: formData.get("name"),
    code: formData.get("code"),
    department: formData.get("department"),
    description: formData.get("description") || "",
    validDurationDays: formData.get("validDurationDays") || 365,
  };

  const parseResult = CreateTrainingSchema.safeParse(rawData);
  if (!parseResult.success) {
    return { success: false, error: parseResult.error.issues[0]?.message || "Invalid training details." };
  }

  const data = parseResult.data;

  const training = await prisma.training.create({
    data: {
      name: data.name,
      code: data.code.toUpperCase(),
      department: data.department,
      description: data.description || "University laboratory safety standard",
      validDurationDays: data.validDurationDays,
    },
  });

  await audit(prisma, {
    actorId: session.id,
    action: "TRAINING_CREATED",
    entityType: "Training",
    entityId: training.id,
    after: { name: data.name, code: data.code.toUpperCase() },
    reason: `Created new campus training module`,
  });

  revalidatePath("/admin");
  return { success: true, trainingId: training.id };
}
