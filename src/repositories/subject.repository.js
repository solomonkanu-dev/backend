import Subject from '../models/Subject.js';
import Class from '../models/Class.js';

export const create = (data) => Subject.create(data);

export const addToClass = (classId, subjectId) =>
  Class.findByIdAndUpdate(classId, { $addToSet: { subjects: subjectId } });

export const findByLecturer = (lecturerId) =>
  Subject.find({ lecturer: lecturerId }).populate('class', 'name');

export const findByClass = (classId) =>
  Subject.find({ class: classId }).populate('lecturer', 'fullName');

export const findByInstitute = (instituteId) =>
  Subject.find({ institute: instituteId }).populate('lecturer', 'fullName email');

export const findById = (id) =>
  Subject.findById(id).populate('lecturer', 'fullName email');

export const save = (doc) => doc.save();

export const findClassById = (classId, instituteId) =>
  Class.findOne({ _id: classId, institute: instituteId });

export const findSubjectForInstitute = (subjectId, institute, extra = {}) =>
  Subject.findOne({ _id: subjectId, institute, ...extra });
