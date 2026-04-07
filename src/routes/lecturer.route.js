import { Router } from 'express';
import { getLecturers, getLecturerById, getMyClasses, getLecturerPromotionEligibility, lecturerBulkPromote } from '../controllers/lecturer.controller.js';
import auth from '../middlewares/auth.js';
import { adminOnly } from '../middlewares/adminOnly.js';
import { lecturerOnly } from '../middlewares/lecturerOnly.js';

const router = Router();

// Admin-facing
router.get('/employee', auth, adminOnly, getLecturers);
router.get('/get-lecturer/:id', auth, adminOnly, getLecturerById);

// Lecturer-self
router.get('/my-classes', auth, lecturerOnly, getMyClasses);
router.get('/promote/eligibility/:classId', auth, lecturerOnly, getLecturerPromotionEligibility);
router.post('/promote/bulk', auth, lecturerOnly, lecturerBulkPromote);

export default router;
