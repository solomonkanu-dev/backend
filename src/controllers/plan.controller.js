import * as planService from '../services/plan.service.js';
import * as monime from '../services/monime.service.js';

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

export const createCheckout = async (req, res, next) => {
  try {
    const frontendBaseUrl = process.env.FRONTEND_URL || 'https://studentmanagementfrontend.vercel.app';
    const data = await planService.createCheckout(req.body.planId, req.user, frontendBaseUrl);
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

export const handleWebhook = async (req, res, next) => {
  try {
    const rawBody = req.rawBody;
    const isValid = monime.verifyWebhookSignature(rawBody, req);

    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Invalid webhook signature' });
    }

    const event = JSON.parse(rawBody.toString());
    await planService.handleWebhookEvent(event);

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};
