import * as planService from '../services/plan.service.js';
import * as monime from '../services/monime.service.js';
import { AppError } from '../errors/AppError.js';

export const getPlans = async (req, res, next) => {
  try {
    const data = await planService.getPlans();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getAvailablePlans = async (req, res, next) => {
  try {
    const data = await planService.getAvailablePlans();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const updatePlanLimits = async (req, res, next) => {
  try {
    const data = await planService.updatePlanLimits(req.params.planId, req.body);
    res.json({ success: true, message: 'Plan updated successfully', data });
  } catch (err) {
    next(err);
  }
};

export const createPlan = async (req, res, next) => {
  try {
    const data = await planService.createPlan(req.body, req);
    res.status(201).json({ success: true, message: 'Plan created', data });
  } catch (err) {
    next(err);
  }
};

export const deletePlan = async (req, res, next) => {
  try {
    await planService.deletePlan(req.params.planId, req);
    res.json({ success: true, message: 'Plan deleted' });
  } catch (err) {
    next(err);
  }
};

export const assignPlanToInstitute = async (req, res, next) => {
  try {
    const data = await planService.assignPlanToInstitute(req.body, req);
    res.json({ success: true, message: 'Plan assigned successfully', data });
  } catch (err) {
    next(err);
  }
};

export const getMyPlan = async (req, res, next) => {
  try {
    const data = await planService.getMyPlan(req.user, req.query.instituteId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getBillingSummary = async (req, res, next) => {
  try {
    const data = await planService.getBillingSummary(req.user);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const createCheckout = async (req, res, next) => {
  try {
    const frontendBaseUrl = process.env.FRONTEND_URL;
    if (!frontendBaseUrl) throw new AppError('FRONTEND_URL is not configured', 500);
    const data = await planService.createCheckout(req.body.studentCount, req.user, frontendBaseUrl);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const verifyPayment = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const data = await planService.verifyAndActivatePlan(sessionId, req.user);
    res.json({ success: true, message: 'Plan activated successfully', data });
  } catch (err) {
    next(err);
  }
};

export const recordManualPayment = async (req, res, next) => {
  try {
    const data = await planService.recordManualPayment(req.body, req);
    res.json({ success: true, message: 'Payment recorded and plan activated', data });
  } catch (err) {
    next(err);
  }
};

export const getPlanPayments = async (req, res, next) => {
  try {
    const data = await planService.getPlanPayments(req.user, req.query.instituteId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getPlanPaymentReceipt = async (req, res, next) => {
  try {
    const data = await planService.getPlanPaymentReceipt(req.params.paymentId, req.user);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const handleWebhook = async (req, res) => {
  // Respond immediately — Monime expects a fast 200
  res.json({ success: true });

  try {
    const rawBody = req.rawBody;

    const hasSignatureHeader =
      req.headers['x-monime-signature'] ||
      req.headers['x-webhook-signature'] ||
      req.headers['monime-signature'];

    // Signature is REQUIRED. Reject events that lack a raw body or signature header,
    // or whose signature fails verification. This closes the path where an attacker
    // POSTed a forged checkout_session.completed and got a plan activated for free.
    if (!rawBody || !hasSignatureHeader) {
      console.warn('[webhook] Missing raw body or signature header — rejecting');
      return;
    }
    if (!monime.verifyWebhookSignature(rawBody, req)) {
      console.warn('[webhook] Invalid Monime signature — rejecting');
      return;
    }

    const event = req.body;
    if (!event || event.type !== 'checkout_session.completed') return;

    const metadata = event?.data?.metadata;
    if (!metadata || typeof metadata.planPaymentId !== 'string') {
      console.warn('[webhook] Malformed metadata — rejecting');
      return;
    }

    // Activation is idempotent — a duplicate webhook is a safe no-op.
    await planService.handleWebhookEvent(event);
  } catch (err) {
    console.error('[webhook] Error processing Monime event:', err);
  }
};
