import { Router } from 'express';
import {
  getPlans, getAvailablePlans, updatePlanLimits,
  assignPlanToInstitute, getMyPlan,
  createCheckout, verifyPayment, handleWebhook,
  getBillingSummary, recordManualPayment,
  getPlanPayments, getPlanPaymentReceipt,
} from '../controllers/plan.controller.js';
import auth from '../middlewares/auth.js';
import superAdminOnly from '../middlewares/superAdmin.js';
import { adminOnly } from '../middlewares/adminOnly.js';

const router = Router();

// Webhook — no auth, raw body captured via app.js verify option
router.post('/webhook', handleWebhook);

// Admin self-service payment (card / mobile money via Monime)
router.get('/billing-summary', auth, adminOnly, getBillingSummary);
router.post('/checkout', auth, adminOnly, createCheckout);
router.get('/verify/:sessionId', auth, adminOnly, verifyPayment);

// Payment history + receipts (admin for own institute, super-admin for any)
router.get('/payments', auth, getPlanPayments);
router.get('/payments/:paymentId/receipt', auth, getPlanPaymentReceipt);

// Super-admin records a cash / bank-transfer payment
router.post('/record-manual-payment', auth, superAdminOnly, recordManualPayment);

// Accessible to any authenticated user (for plan selection page)
router.get('/available', auth, getAvailablePlans);

// Existing routes
router.get('/my-plan', auth, getMyPlan);
router.patch('/assign', auth, superAdminOnly, assignPlanToInstitute);
router.get('/', auth, superAdminOnly, getPlans);
router.patch('/:planId', auth, superAdminOnly, updatePlanLimits);

export default router;
