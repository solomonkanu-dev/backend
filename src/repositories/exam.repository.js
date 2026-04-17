import Exam from '../models/Exam.js';

const POPULATE = [
  { path: 'subject', select: 'name code' },
  { path: 'class', select: 'name' },
  { path: 'term', select: 'name academicYear type' },
  { path: 'createdBy', select: 'fullName' },
];

export const create = (data) => Exam.create(data);

export const findByFilter = (filter) =>
  Exam.find(filter).populate(POPULATE).sort({ date: 1 });

export const findById = (id) =>
  Exam.findById(id).populate(POPULATE);

export const findByIdAndInstitute = (id, instituteId) =>
  Exam.findOne({ _id: id, institute: instituteId });

export const updateById = (id, update) =>
  Exam.findByIdAndUpdate(id, update, { new: true, runValidators: true });

export const deleteById = (id) =>
  Exam.findByIdAndDelete(id);
