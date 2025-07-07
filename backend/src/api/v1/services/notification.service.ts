import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function getNotifications(userId: string, unread: boolean) {
  const where = unread ? { userId, isRead: false } : { userId };
  return prisma.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
}

export async function markNotificationRead(id: string) {
  return prisma.notification.update({
    where: { id },
    data: { isRead: true },
  });
}

export async function createNotification(data: { userId: string, title: string, message: string, link?: string }) {
  return prisma.notification.create({ data });
} 