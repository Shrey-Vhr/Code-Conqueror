import { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "./prisma";

type DbClient = Prisma.TransactionClient | PrismaClient;

export interface NotificationParams {
  userId: string;
  type: string;
  message: string;
  link?: string;
}

export async function createNotification(
  db: DbClient,
  params: NotificationParams
) {
  return await db.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      message: params.message,
      link: params.link ?? null,
    },
  });
}

export async function getUserNotifications(userId: string) {
  return await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
}

export async function getUnreadCount(userId: string): Promise<number> {
  return await prisma.notification.count({
    where: { userId, read: false },
  });
}

export async function markNotificationAsRead(id: string, userId: string) {
  return await prisma.notification.updateMany({
    where: { id, userId },
    data: { read: true },
  });
}

export async function markAllNotificationsAsRead(userId: string) {
  return await prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
}
