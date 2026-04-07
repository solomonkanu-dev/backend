import User from '../models/user.js';
import Class from '../models/Class.js';
import Attendance from '../models/Attendance.js';

export const findStudentByToken = (qrToken, institute) =>
  User.findOne({ qrToken, role: 'student', institute })
    .select('_id fullName qrActive class')
    .lean();

export const findTodayAttendance = (classId, instituteId, today) =>
  Attendance.findOne({ class: classId, institute: instituteId, date: today, type: 'student', subject: null });

export const createAttendance = (data) => Attendance.create(data);

export const findClassWithStudents = (classId, instituteId) =>
  Class.findOne({ _id: classId, institute: instituteId }).populate('students', 'fullName studentProfile.registrationNumber').lean();

export const findClassById = (classId, instituteId) =>
  Class.findOne({ _id: classId, institute: instituteId }).select('students').lean();

export const findStudentById = (id, instituteId) =>
  User.findOne({ _id: id, role: 'student', institute: instituteId })
    .select('fullName qrToken qrActive studentProfile')
    .lean();

export const updateStudentQR = (studentId, update, opts) =>
  User.findOneAndUpdate(
    { _id: studentId, role: 'student' },
    update,
    { ...opts, select: 'fullName qrToken qrActive' }
  ).lean();

export const bulkWriteUsers = (ops) => User.bulkWrite(ops);

export const findStudentsWithoutToken = () =>
  User.find({ role: 'student', qrToken: null }).select('_id').lean();
