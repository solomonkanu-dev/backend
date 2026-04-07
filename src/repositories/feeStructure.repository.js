import FeeStructure from '../models/FeeStructure.js';

export const findById = (id) => FeeStructure.findById(id);

export const findPaginated = (query, skip, limit) =>
  FeeStructure.find(query).skip(skip).limit(limit).sort({ createdAt: -1 });

export const countDocuments = (query) => FeeStructure.countDocuments(query);

export const createFeeStructure = (data) => FeeStructure.create(data);

export const deleteById = (id) => FeeStructure.findByIdAndDelete(id);
