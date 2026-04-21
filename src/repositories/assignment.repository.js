import Assignment from '../models/Assignment.js';
import Subject from '../models/Subject.js';
import User from '../models/user.js';

export const create = (data) => Assignment.create(data);

export const findBySubject = (subjectId, institute, extra = {}) =>
  Assignment.find({ subject: subjectId, institute, ...extra })
    .populate('subject', 'name code')
    .sort({ dueDate: 1 });

export const findByClass = (classId, institute, extra = {}) =>
  Assignment.find({ class: classId, institute, ...extra })
    .populate('subject', 'name code')
    .populate('lecturer', 'fullName')
    .sort({ dueDate: 1 });

export const findByLecturer = (lecturerId, institute) =>
  Assignment.find({ lecturer: lecturerId, institute })
    .populate('subject', 'name code')
    .populate('class', 'name')
    .sort({ dueDate: 1 });

export const findOne = (filter) =>
  Assignment.findOne(filter)
    .populate('subject', 'name code')
    .populate('class', 'name')
    .populate('lecturer', 'fullName');

export const save = (doc) => doc.save();

export const deleteOne = (doc) => doc.deleteOne();

// helpers for email notification
export const findSubjectById = (id) => Subject.findById(id).select('name').lean();

export const findStudentsByClass = (classId, instituteId) =>
  User.find({ class: classId, institute: instituteId, role: 'student', isActive: true })
    .select('_id email fullName emailOptOut studentProfile')
    .lean();
