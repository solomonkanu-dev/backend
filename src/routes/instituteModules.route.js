import { Router } from 'express';
import { getModules, updateModules, getLecturerAccess, setLecturerAccess } from '../controllers/instituteModules.controller.js';
import auth from '../middlewares/auth.js';
import { adminOnly } from '../middlewares/adminOnly.js';
import { validateModuleKeys, validateModuleAccessArray } from '../validators/instituteModules.validator.js';

const router = Router();

// All roles — fetch their institute's module toggles (used to build sidebar)
router.get('/admin/modules/me', auth, getModules);

// Admin only — manage institute module toggles
router.patch('/admin/modules', auth, adminOnly, validateModuleKeys, updateModules);

// Admin only — manage per-lecturer module access
router.get('/admin/lecturers/:lecturerId/module-access', auth, adminOnly, getLecturerAccess);
router.put('/admin/lecturers/:lecturerId/module-access', auth, adminOnly, validateModuleAccessArray, setLecturerAccess);

export default router;
