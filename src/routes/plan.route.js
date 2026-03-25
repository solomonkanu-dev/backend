import { Router } from 'express';
import { getPlans, updatePlanLimits, assignPlanToInstitute, getMyPlan } from '../controllers/plan.controller.js';
import auth from '../middlewares/auth.js';
import superAdminOnly from '../middlewares/superAdmin.js';

const router = Router();

// Note: /assign and /my-plan defined before /:planId to avoid route conflicts
router.get('/my-plan', auth, getMyPlan);
router.patch('/assign', auth, superAdminOnly, assignPlanToInstitute);
router.get('/', auth, superAdminOnly, getPlans);
router.patch('/:planId', auth, superAdminOnly, updatePlanLimits);

export default router;
