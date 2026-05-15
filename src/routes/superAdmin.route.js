import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { getRedisClient } from '../config/redis.js';
import {
  approveAdmin,
  deletePendingAdmin,
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
  setAdminUnderReview,
  approveAdminOnboarding,
  rejectAdminOnboarding,
  getAdminOnboardingList,
  getAdminOnboardingDetail,
  getOnlineUsers,
  getOnlineReports,
  getOnlineReport,
} from '../controllers/superAdmin.controller.js';
import auth from '../middlewares/auth.js';
import superAdminOnly from '../middlewares/superAdmin.js';


const router = Router();

// Rate-limit the super-admin login — this is the highest-value credential in
// the system, and it lives outside the /api/v1/auth prefix that the global
// auth limiter is mounted on.
const superAdminLoginStore = (() => {
  const client = getRedisClient();
  if (!client) return undefined;
  return new RedisStore({
    prefix: 'studman:rl:super-admin-login:',
    sendCommand: (command, ...args) => client.call(command, ...args),
  });
})();
const superAdminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  store: superAdminLoginStore,
});

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
  superAdminLoginLimiter,
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
router.delete('/pending-admins/:adminId', auth, superAdminOnly, deletePendingAdmin);
router.get('/admins', auth, superAdminOnly, getAllAdmins);
router.patch('/admins/:adminId/suspend', auth, superAdminOnly, suspendAdmin);
router.patch('/admins/:adminId/unsuspend', auth, superAdminOnly, unsuspendAdmin);

// Onboarding workflow
router.get('/onboarding', auth, superAdminOnly, getAdminOnboardingList);
router.get('/onboarding/:adminId', auth, superAdminOnly, getAdminOnboardingDetail);
router.patch('/onboarding/:adminId/review', auth, superAdminOnly, setAdminUnderReview);
router.patch('/onboarding/:adminId/approve', auth, superAdminOnly, approveAdminOnboarding);
router.patch('/onboarding/:adminId/reject', auth, superAdminOnly, rejectAdminOnboarding);

// System-wide monitoring
router.get('/monitor/online-users', auth, superAdminOnly, getOnlineUsers);
router.get('/monitor/online-reports', auth, superAdminOnly, getOnlineReports);
router.get(
  '/monitor/online-reports/:reportId',
  auth,
  superAdminOnly,
  [param('reportId').isMongoId().withMessage('Invalid report ID')],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });
    getOnlineReport(req, res, next);
  }
);
router.get('/monitor/overview', auth, superAdminOnly, getSystemOverview);
router.get('/monitor/institutes', auth, superAdminOnly, getInstituteHealthReport);
router.get('/monitor/institutes/:instituteId', auth, superAdminOnly, getInstituteDeepReport);
router.get('/monitor/growth', auth, superAdminOnly, getGrowthTrends);
router.get('/monitor/fee-revenue', auth, superAdminOnly, getFeeRevenueReport);
router.get('/monitor/salary-expenditure', auth, superAdminOnly, getSalaryExpenditureReport);

export default router;
