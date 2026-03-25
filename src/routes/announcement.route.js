import { Router } from 'express';
import {
  createAnnouncement,
  getAnnouncements,
  markAsRead,
  getAnnouncementReadStatus,
  updateAnnouncement,
  deleteAnnouncement,
} from '../controllers/announcement.controller.js';
import auth from '../middlewares/auth.js';
import superAdminOnly from '../middlewares/superAdmin.js';

const router = Router();

// Note: /:id/read and /:id/read-status defined before /:id to avoid conflicts
router.post('/', auth, superAdminOnly, createAnnouncement);
router.get('/', auth, getAnnouncements);
router.post('/:id/read', auth, markAsRead);
router.get('/:id/read-status', auth, superAdminOnly, getAnnouncementReadStatus);
router.patch('/:id', auth, superAdminOnly, updateAnnouncement);
router.delete('/:id', auth, superAdminOnly, deleteAnnouncement);

export default router;
