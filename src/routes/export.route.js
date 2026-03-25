import { Router } from 'express';
import {
  exportStudentList,
  exportLecturerList,
  exportFeeCollection,
  exportSalaryReport,
  exportAttendanceSummary,
} from '../controllers/export.controller.js';
import auth from '../middlewares/auth.js';
import { adminOrSuperAdmin } from '../middlewares/adminOrSuperAdmin.js';
import superAdminOnly from '../middlewares/superAdmin.js';

const router = Router();

router.get('/students',           auth, adminOrSuperAdmin, exportStudentList);
router.get('/lecturers',          auth, adminOrSuperAdmin, exportLecturerList);
router.get('/fee-collection',     auth, adminOrSuperAdmin, exportFeeCollection);
router.get('/salary',             auth, superAdminOnly,    exportSalaryReport);
router.get('/attendance-summary', auth, adminOrSuperAdmin, exportAttendanceSummary);

export default router;
