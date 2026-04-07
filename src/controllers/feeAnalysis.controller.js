import * as feeAnalysisService from '../services/feeAnalysis.service.js';

export const getFeeSummary = async (req, res, next) => {
  try {
    const data = await feeAnalysisService.getFeeSummary(req.user.institute);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getFeeByClass = async (req, res, next) => {
  try {
    const data = await feeAnalysisService.getFeeByClass(req.user.institute);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getFeeByStatus = async (req, res, next) => {
  try {
    const data = await feeAnalysisService.getFeeByStatus(req.user.institute);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getDefaulters = async (req, res, next) => {
  try {
    const data = await feeAnalysisService.getDefaulters(req.user.institute, req.query.limit);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getCollectionTrend = async (req, res, next) => {
  try {
    const data = await feeAnalysisService.getCollectionTrend(req.user.institute);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
