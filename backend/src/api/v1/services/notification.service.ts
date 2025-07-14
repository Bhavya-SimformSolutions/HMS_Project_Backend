import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Define an interface for the WebSocket service
interface NotificationPayload {
  id: string;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

interface IWebSocketService {
  sendNotificationToUser(userId: string, notification: NotificationPayload): void;
}

// WebSocket service instance for real-time notifications
let webSocketService: IWebSocketService | null = null;

/**
 * Set WebSocket service instance
 */
export function setWebSocketService(service: IWebSocketService) {
  webSocketService = service;
}

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

/**
 * Create notification with real-time delivery
 */
export async function createNotification(data: { userId: string, title: string, message: string, link?: string }) {
  // Create notification in database
  const notification = await prisma.notification.create({
    data: {
      userId: data.userId,
      title: data.title,
      message: data.message,
      link: data.link,
      isRead: false,
      createdAt: new Date()
    }
  });

  // Send real-time notification if WebSocket service is available
  if (webSocketService) {
    webSocketService.sendNotificationToUser(data.userId, {
      id: notification.id,
      title: notification.title,
      message: notification.message,
      link: notification.link ?? undefined,
      isRead: notification.isRead,
      createdAt: notification.createdAt.toISOString()
    });
  }

  return notification;
}