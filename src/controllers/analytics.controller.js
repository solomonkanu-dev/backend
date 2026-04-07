import * as analyticsService from '../services/analytics.service.js';

export const getAttendanceSummary = async (req, res, next) => {
  try {
    const data = await analyticsService.getAttendanceSummary(req.user, req.query);
    res.json({ data });
  } catch (err) {
    next(err);
  }
};

export const getFeeDefaults = async (req, res, next) => {
  try {
    const data = await analyticsService.getFeeDefaults(req.user, req.query);
    res.json({ data });
  } catch (err) {
    next(err);
  }
};

export const getAssignmentCompletion = async (req, res, next) => {
  try {
    const data = await analyticsService.getAssignmentCompletion(req.user, req.query);
    res.json({ data });
  } catch (err) {
    next(err);
  }
};

export const getEnrollmentTrends = async (req, res, next) => {
  try {
    const data = await analyticsService.getEnrollmentTrends(req.user, req.query);
    res.json({ data });
  } catch (err) {
    next(err);
  }
};
