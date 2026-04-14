import { Router } from 'express';
import {
  getPlans, getAvailablePlans, updatePlanLimits,
  assignPlanToInstitute, getMyPlan,
  createCheckout, verifyPayment, handleWebhook,
} from '../controllers/plan.controller.js';
import auth from '../middlewares/auth.js';
import superAdminOnly from '../middlewares/superAdmin.js';

const router = Router();

// Webhook — no auth, raw body captured via app.js verify option
router.post('/webhook', handleWebhook);

// Admin self-service payment
router.post('/checkout', auth, createCheckout);
router.get('/verify/:sessionId', auth, verifyPayment);

// Accessible to any authenticated user (for plan selection page)
router.get('/available', auth, getAvailablePlans);

// Existing routes
router.get('/my-plan', auth, getMyPlan);
router.patch('/assign', auth, superAdminOnly, assignPlanToInstitute);
router.get('/', auth, superAdminOnly, getPlans);
router.patch('/:planId', auth, superAdminOnly, updatePlanLimits);

export default router;
