import Result from '../models/Result.js';

export const findOneAndUpsert = (filter, update, opts) =>
  Result.findOneAndUpdate(filter, update, { upsert: true, new: true, runValidators: true, ...opts });

export const findByClass = (classId, instituteId) =>
  Result.find({ class: classId, institute: instituteId })
    .populate('student', 'fullName email')
    .populate('subject', 'name totalMarks');

export const findBySubject = (subjectId, instituteId) =>
  Result.find({ subject: subjectId, institute: instituteId })
    .populate('student', 'fullName email')
    .populate('subject', 'name totalMarks');
