import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import {
  approveAdmin,
  getPendingAdmins,
} from '../controllers/superAdmin.controller.js';
import auth from '../middlewares/auth.js';
import superAdminOnly from '../middlewares/superAdmin.js';
import { superAdminLogin, getSystemStats } from '../controllers/superAdmin.controller.js';


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

export default router;
