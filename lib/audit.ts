import { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "./prisma";

export interface AuditParams {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  before?: Record<string, any> | string | null;
  after?: Record<string, any> | string | null;
  reason?: string | null;
}

type DbClient = Prisma.TransactionClient | PrismaClient;

export async function audit(
  db: DbClient,
  params: AuditParams
): Promise<void> {
  const beforeStr =
    typeof params.before === "object" && params.before !== null
      ? JSON.stringify(params.before)
      : params.before ?? null;

  const afterStr =
    typeof params.after === "object" && params.after !== null
      ? JSON.stringify(params.after)
      : params.after ?? null;

  await db.auditLog.create({
    data: {
      actorId: params.actorId ?? null,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      before: beforeStr,
      after: afterStr,
      reason: params.reason ?? null,
    },
  });
}
