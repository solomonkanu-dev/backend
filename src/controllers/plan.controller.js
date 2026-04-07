import * as planService from '../services/plan.service.js';

export const getPlans = async (req, res, next) => {
  try {
    const data = await planService.getPlans();
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
