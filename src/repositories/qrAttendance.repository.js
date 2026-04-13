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

// Atomically mark a student present — returns { alreadyPresent: boolean }
export const markStudentPresentAtomic = async (classId, instituteId, today, studentId, markedBy) => {
  // Step 1: ensure the attendance doc exists for today
  await Attendance.updateOne(
    { class: classId, institute: instituteId, date: today, type: 'student', subject: null },
    { $setOnInsert: { class: classId, institute: instituteId, date: today, type: 'student', subject: null, markedBy, records: [] } },
    { upsert: true }
  );

  // Step 2: push student record only if not already in records
  const pushResult = await Attendance.updateOne(
    { class: classId, institute: instituteId, date: today, type: 'student', subject: null, 'records.student': { $ne: studentId } },
    { $push: { records: { student: studentId, status: 'present' } }, $set: { markedBy } }
  );

  if (pushResult.modifiedCount > 0) return { alreadyPresent: false };

  // Student already in records — check their current status
  const doc = await Attendance.findOne(
    { class: classId, institute: instituteId, date: today, type: 'student', subject: null },
    { records: { $elemMatch: { student: studentId } } }
  );

  const record = doc?.records?.[0];
  if (record?.status === 'present') return { alreadyPresent: true };

  // Was absent — update to present atomically
  await Attendance.updateOne(
    { class: classId, institute: instituteId, date: today, type: 'student', 'records.student': studentId },
    { $set: { 'records.$.status': 'present', markedBy } }
  );
  return { alreadyPresent: false };
};

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
