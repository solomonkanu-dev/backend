import Result from '../models/Result.js';

export const findOneAndUpsert = (filter, update, opts) =>
  Result.findOneAndUpdate(filter, update, { upsert: true, new: true, runValidators: true, ...opts });

// Optional termId narrows results to a specific term; omit for all-terms (annual)
export const findByClass = (classId, instituteId, termId) => {
  const filter = { class: classId, institute: instituteId };
  if (termId) filter.term = termId;
  return Result.find(filter)
    .populate('student', 'fullName email')
    .populate('subject', 'name code totalMarks caTotal examTotal')
    .populate('term', 'name academicYear');
};

export const findBySubject = (subjectId, instituteId) =>
  Result.find({ subject: subjectId, institute: instituteId })
    .populate('student', 'fullName email')
    .populate('subject', 'name totalMarks caTotal examTotal');
