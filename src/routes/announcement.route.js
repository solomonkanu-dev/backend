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
import { adminOrSuperAdmin } from '../middlewares/adminOrSuperAdmin.js';

const router = Router();

// Note: /:id/read and /:id/read-status defined before /:id to avoid conflicts
// Admins can create/manage announcements scoped to their own institute.
// Super admins can manage all. Ownership checks are enforced in the service layer.
router.post('/', auth, adminOrSuperAdmin, createAnnouncement);
router.get('/', auth, getAnnouncements);
router.post('/:id/read', auth, markAsRead);
router.get('/:id/read-status', auth, adminOrSuperAdmin, getAnnouncementReadStatus);
router.patch('/:id', auth, adminOrSuperAdmin, updateAnnouncement);
router.delete('/:id', auth, adminOrSuperAdmin, deleteAnnouncement);

export default router;
