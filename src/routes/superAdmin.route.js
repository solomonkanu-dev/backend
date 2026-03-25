import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import {
  approveAdmin,
  getPendingAdmins,
  superAdminLogin,
  getSystemStats,
  getAllAdmins,
  suspendAdmin,
  unsuspendAdmin,
  getSystemOverview,
  getInstituteHealthReport,
  getGrowthTrends,
  getFeeRevenueReport,
  getSalaryExpenditureReport,
  getInstituteDeepReport,
} from '../controllers/superAdmin.controller.js';
import auth from '../middlewares/auth.js';
import superAdminOnly from '../middlewares/superAdmin.js';


const router = Router();

/**
 * Super Admin approves Admin signup request
 */

router.patch(
  '/approve-admin/:adminId',
  auth,
  superAdminOnly,
  [param('adminId').isMongoId().withMessage('Invalid admin ID')],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    approveAdmin(req, res, next);
  }
);

router.post(
  '/super-admin/login',
  [
    body('email').isEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password required'),
  ],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    superAdminLogin(req, res, next);
  }
);

router.get(
  '/stats',
  auth,
  superAdminOnly,
  getSystemStats
);


router.get('/pending-admins', auth, superAdminOnly, getPendingAdmins);
router.get('/admins', auth, superAdminOnly, getAllAdmins);
router.patch('/admins/:adminId/suspend', auth, superAdminOnly, suspendAdmin);
router.patch('/admins/:adminId/unsuspend', auth, superAdminOnly, unsuspendAdmin);

// System-wide monitoring
router.get('/monitor/overview', auth, superAdminOnly, getSystemOverview);
router.get('/monitor/institutes', auth, superAdminOnly, getInstituteHealthReport);
router.get('/monitor/institutes/:instituteId', auth, superAdminOnly, getInstituteDeepReport);
router.get('/monitor/growth', auth, superAdminOnly, getGrowthTrends);
router.get('/monitor/fee-revenue', auth, superAdminOnly, getFeeRevenueReport);
router.get('/monitor/salary-expenditure', auth, superAdminOnly, getSalaryExpenditureReport);

export default router;
