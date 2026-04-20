import FeeStructure from '../models/FeeStructure.js';

export const findById = (id) =>
  FeeStructure.findById(id)
    .populate('classId', 'name')
    .populate('studentId', 'fullName');

export const findPaginated = (query, skip, limit) =>
  FeeStructure.find(query)
    .populate('classId', 'name')
    .populate('studentId', 'fullName')
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

export const countDocuments = (query) => FeeStructure.countDocuments(query);

export const createFeeStructure = (data) => FeeStructure.create(data);

export const deleteById = (id) => FeeStructure.findByIdAndDelete(id);
