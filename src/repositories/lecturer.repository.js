import User from '../models/user.js';
import Class from '../models/Class.js';
import Result from '../models/Result.js';
import StudentFee from '../models/StudentFee.js';
import Attendance from '../models/Attendance.js';

export const findAll = () => User.find({ role: 'lecturer' }).populate('institute', 'name');

export const findById = (id, instituteId) =>
  User.findOne({ _id: id, role: 'lecturer', institute: instituteId }).populate('institute', 'name');

export const findMyClasses = (userId, instituteId) =>
  Class.find({ lecturer: userId, institute: instituteId }).select('name students subjects').lean();

export const findClassByLecturer = (classId, instituteId, lecturerId) =>
  Class.findOne({ _id: classId, institute: instituteId, lecturer: lecturerId });

export const findClassByInstitute = (classId, instituteId) =>
  Class.findOne({ _id: classId, institute: instituteId });

export const findStudentsByClass = (classId, instituteId) =>
  User.find({ class: classId, institute: instituteId, role: 'student' })
    .select('fullName email lifecycleStatus')
    .lean();

export const findResultsByClass = (classId, studentIds) =>
  Result.find({ class: classId, student: { $in: studentIds } }).lean();

export const findFeesByClass = (classId, studentIds, instituteId) =>
  StudentFee.find({ class: classId, student: { $in: studentIds }, institute: instituteId }).lean();

export const findAttendanceByClass = (classId, instituteId) =>
  Attendance.find({ class: classId, institute: instituteId, type: 'student' }).lean();

export const updateManyStudents = (filter, update) => User.updateMany(filter, update);

export const updateOneClass = (filter, update) => Class.updateOne(filter, update);
