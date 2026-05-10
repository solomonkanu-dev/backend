import { Router } from 'express';
import {
  getMaintenanceStatus,
  toggleGlobalMaintenance,
  toggleInstituteMaintenance,
  getMyInstituteMaintenanceStatus,
  getInstituteNotificationChannels,
  setInstituteNotificationChannels,
} from '../controllers/systemConfig.controller.js';
import auth from '../middlewares/auth.js';
import superAdminOnly from '../middlewares/superAdmin.js';
import { adminOnly } from '../middlewares/adminOnly.js';

const router = Router();

router.get('/maintenance', getMaintenanceStatus);
router.patch('/maintenance/global', auth, superAdminOnly, toggleGlobalMaintenance);
router.patch('/maintenance/institute', auth, superAdminOnly, toggleInstituteMaintenance);
router.get('/maintenance/my-institute', auth, adminOnly, getMyInstituteMaintenanceStatus);
router.get('/notifications/institutes',  auth, superAdminOnly, getInstituteNotificationChannels);
router.patch('/notifications/institute', auth, superAdminOnly, setInstituteNotificationChannels);

export default router;
