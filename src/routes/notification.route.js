import { Router } from 'express';
import {
  getMyNotifications,
  getUnreadCount,
  markAllRead,
  markNotificationRead,
  deleteNotification,
  registerPushToken,
  unregisterPushToken,
} from '../controllers/notification.controller.js';
import auth from '../middlewares/auth.js';

const router = Router();

// Note: /unread-count, /read-all, /push-token defined before /:id to avoid conflicts
router.get('/', auth, getMyNotifications);
router.get('/unread-count', auth, getUnreadCount);
router.patch('/read-all', auth, markAllRead);
router.post('/push-token', auth, registerPushToken);
router.delete('/push-token', auth, unregisterPushToken);
router.patch('/:id/read', auth, markNotificationRead);
router.delete('/:id', auth, deleteNotification);

export default router;
