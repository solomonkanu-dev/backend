import Submission from '../models/Submission.js';
import Assignment from '../models/Assignment.js';

export const create = (data) => Submission.create(data);

export const findOne = (filter) =>
  Submission.findOne(filter);

export const findByAssignment = (assignmentId) =>
  Submission.find({ assignment: assignmentId })
    .populate('student', 'fullName email studentProfile')
    .populate('assignment', 'title totalMarks dueDate subject')
    .sort({ createdAt: 1 });

export const findByStudent = (studentId) =>
  Submission.find({ student: studentId })
    .populate({
      path: 'assignment',
      select: 'title dueDate totalMarks status subject',
      populate: { path: 'subject', select: 'name code' },
    })
    .sort({ createdAt: -1 });

export const findByIdWithAssignment = (id) =>
  Submission.findById(id).populate('assignment');

export const save = (doc) => doc.save();

export const findAssignmentForInstitute = (assignmentId, institute) =>
  Assignment.findOne({ _id: assignmentId, institute });
