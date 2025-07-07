import { Request, Response } from 'express';
import { createNotificationSchema } from '../validations/notification.validation';
import * as notificationService from '../services/notification.service';

// declare global {
//   namespace Express {
//     interface Request {
//       user?: { id: string };
//     }
//   }
// }

export const getNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const unread = req.query.unread === 'true';
    const notifications = await notificationService.getNotifications(userId, unread);
    res.json({ notifications });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

export const markNotificationRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const notification = await notificationService.markNotificationRead(id);
    res.json({ notification });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
};

export const createNotification = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = createNotificationSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.errors });
      return;
    }
    const notification = await notificationService.createNotification(parsed.data);
    res.status(201).json({ notification });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create notification' });
  }
}; 