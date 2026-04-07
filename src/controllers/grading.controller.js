import * as gradingService from '../services/grading.service.js';

// Re-export resolveGrade so any legacy imports of it from this file still work.
export { resolveGrade } from '../services/grading.service.js';

export const createGradingScale = async (req, res, next) => {
  try {
    const data = await gradingService.createGradingScale(req.body, req.user);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getGradingScales = async (req, res, next) => {
  try {
    const data = await gradingService.getGradingScales(req.user);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getDefaultGradingScale = async (req, res, next) => {
  try {
    const data = await gradingService.getDefaultGradingScale(req.user);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getGradingScaleById = async (req, res, next) => {
  try {
    const data = await gradingService.getGradingScaleById(req.params.id, req.user);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const updateGradingScale = async (req, res, next) => {
  try {
    const data = await gradingService.updateGradingScale(req.params.id, req.body, req.user);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const setDefaultGradingScale = async (req, res, next) => {
  try {
    const scale = await gradingService.setDefaultGradingScale(req.params.id, req.user);
    res.json({ success: true, message: `"${scale.name}" is now the default grading scale` });
  } catch (err) {
    next(err);
  }
};

export const deleteGradingScale = async (req, res, next) => {
  try {
    await gradingService.deleteGradingScale(req.params.id, req.user);
    res.json({ success: true, message: 'Grading scale deleted successfully' });
  } catch (err) {
    next(err);
  }
};
