import * as feeStructureService from '../services/feeStructure.service.js';

export const createFeeStructure = async (req, res, next) => {
  try {
    const data = await feeStructureService.createFeeStructure(req.body, req.user);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getFeeStructures = async (req, res, next) => {
  try {
    const result = await feeStructureService.getFeeStructures(req.query, req.user);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

export const getFeeStructureById = async (req, res, next) => {
  try {
    const data = await feeStructureService.getFeeStructureById(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const updateFeeStructure = async (req, res, next) => {
  try {
    const data = await feeStructureService.updateFeeStructure(req.params.id, req.body);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const deleteFeeStructure = async (req, res, next) => {
  try {
    const data = await feeStructureService.deleteFeeStructure(req.params.id);
    res.json({ success: true, data, message: 'Deleted' });
  } catch (err) {
    next(err);
  }
};

export default {
  createFeeStructure,
  getFeeStructures,
  getFeeStructureById,
  updateFeeStructure,
  deleteFeeStructure,
};
