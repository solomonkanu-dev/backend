import { Router } from 'express';
import {
  getMyNotifications,
  getUnreadCount,
  markAllRead,
  markNotificationRead,
  deleteNotification,
} from '../controllers/notification.controller.js';
import auth from '../middlewares/auth.js';

const router = Router();

// Note: /unread-count and /read-all defined before /:id to avoid conflicts
router.get('/', auth, getMyNotifications);
router.get('/unread-count', auth, getUnreadCount);
router.patch('/read-all', auth, markAllRead);
router.patch('/:id/read', auth, markNotificationRead);
router.delete('/:id', auth, deleteNotification);

export default router;
