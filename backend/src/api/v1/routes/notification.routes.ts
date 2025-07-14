import { Router } from 'express';
import { getNotifications, markNotificationRead, createNotification } from '../controllers/notification.controller';
import { verifyJWT } from '../middlewares/jwt.middleware';

const router = Router();

// List notifications for the logged-in user
router.get('/', verifyJWT, getNotifications);
// Mark a notification as read
router.patch('/:id/read', verifyJWT, markNotificationRead);
// Create a notification (internal use)
router.post('/', verifyJWT, createNotification);

export default router; 