import FeeStructure from '../models/FeeStructure.js';

export const findByIds = (ids, instituteId) =>
  FeeStructure.find({ _id: { $in: ids }, instituteId });
