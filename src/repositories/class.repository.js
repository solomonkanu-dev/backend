import Class from '../models/Class.js';
import User from '../models/user.js';
import Subject from '../models/Subject.js';

export const create = (data) => Class.create(data);

export const findOne = (filter) => Class.findOne(filter);

export const findById = (id) => Class.findById(id);

export const findByLecturer = (lecturerId) =>
  Class.find({ lecturer: lecturerId }).populate('students', 'fullName email');

export const findByStudent = (studentId) =>
  Class.find({ students: studentId }).populate('lecturer', 'fullName');

export const findByInstitute = (institute) =>
  Class.find({ institute }).populate('lecturer', 'fullName').populate('students', 'fullName');

export const findByInstituteWithLecturer = (institute) =>
  Class.find({ institute }).populate('lecturer', 'fullName email');

export const findByInstituteWithDetails = (filter, skip, limit) =>
  Class.find(filter)
    .skip(skip)
    .limit(limit)
    .populate('lecturer', 'fullName email')
    .populate('students', 'fullName email studentProfile');

export const countDocuments = (filter) => Class.countDocuments(filter);

export const findByIdWithDetails = (id, instituteId) =>
  Class.findOne({ _id: id, institute: instituteId })
    .populate('lecturer', 'fullName email role phoneNumber')
    .populate('students', 'fullName email role class studentProfile');

export const findByIdWithStudents = (id) =>
  Class.findById(id).populate('students', 'fullName email');

export const save = (doc) => doc.save();

export const addStudent = (classId, studentId) =>
  Class.findByIdAndUpdate(classId, { $addToSet: { students: studentId } });

export const findByInstituteWithSubjectSummary = (instituteId) =>
  Class.find({ institute: instituteId })
    .populate('lecturer', 'fullName email')
    .populate('students', 'fullName email studentProfile')
    .lean();

export const findSubjectsByInstitute = (instituteId) =>
  Subject.find({ institute: instituteId }).lean();

export const findStudentsByClass = (classId, institute, extra = {}) =>
  User.find({ role: 'student', class: classId, institute, ...extra })
    .select('fullName email studentProfile profilePhoto isActive')
    .lean();

export const updateLecturer = (classId, lecturerId) =>
  Class.findByIdAndUpdate(classId, { lecturer: lecturerId }, { new: true });

export const findLecturer = (lecturerId, institute) =>
  User.findOne({ _id: lecturerId, role: 'lecturer', institute });
