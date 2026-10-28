"use server";

import { requireAuth } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export async function submitCertificationAction(formData: FormData) {
  const session = await requireAuth();

  const trainingId = formData.get("trainingId") as string;
  const documentNote = formData.get("documentNote") as string;

  if (!trainingId || !documentNote || documentNote.trim().length === 0) {
    return { success: false, error: "Please select a training module and provide documentation notes." };
  }

  // Check if certification already exists for this training
  const existing = await prisma.userCertification.findFirst({
    where: {
      userId: session.id,
      trainingId,
    },
  });

  const cert = await prisma.$transaction(async (tx) => {
    let userCert;
    if (existing) {
      userCert = await tx.userCertification.update({
        where: { id: existing.id },
        data: {
          status: "PENDING",
          documentNote: documentNote.trim(),
          expiresAt: null,
          verifiedById: null,
        },
      });
    } else {
      userCert = await tx.userCertification.create({
        data: {
          userId: session.id,
          trainingId,
          status: "PENDING",
          documentNote: documentNote.trim(),
        },
      });
    }

    await audit(tx, {
      actorId: session.id,
      action: "CERTIFICATION_REQUESTED",
      entityType: "UserCertification",
      entityId: userCert.id,
      after: { trainingId, status: "PENDING" },
      reason: "User submitted safety training documentation for verification",
    });

    return userCert;
  });

  revalidatePath("/profile");
  revalidatePath("/admin");
  return { success: true, certId: cert.id };
}
