import User from '../models/user.js';
import Institute from '../models/Institute.js';
import Class from '../models/Class.js';
import Subject from '../models/Subject.js';
import Assignment from '../models/Assignment.js';
import Submission from '../models/Submission.js';
import Result from '../models/Result.js';
import AcademicTerm from '../models/AcademicTerm.js';
import FeeParticular from '../models/Fees.js';
import Attendance from '../models/Attendance.js';
import StudentFee from '../models/StudentFee.js';
import mongoose from 'mongoose';

// ─── User ─────────────────────────────────────────────────────────────────────

export const findUserByEmail = (email) => User.findOne({ email });

export const findUserById = (id) => User.findById(id);

export const findUserByIdAndInstitute = (id, institute, role) =>
  User.findOne({ _id: id, institute, role });

export const findStudentById = (studentId, instituteId) =>
  User.findOne({ _id: studentId, institute: instituteId, role: 'student' }).select('-password').populate({ path: 'class', select: 'name lecturer', populate: { path: 'lecturer', select: 'fullName' } });

export const findLecturerById = (lecturerId, instituteId) =>
  User.findOne({ _id: lecturerId, institute: instituteId, role: 'lecturer' }).select('-password');

export const createUser = (data) => User.create(data);

export const findUsersPaginated = (filter, skip, limit) => User.find(filter).skip(skip).limit(limit);

export const findStudentsPaginated = (filter, skip, limit) =>
  User.find(filter).skip(skip).limit(limit).populate('class', 'name');

export const countUsers = (filter) => User.countDocuments(filter);

export const updateUserById = (id, update) => User.findByIdAndUpdate(id, update, { new: true });

export const saveUser = (user) => user.save();

export const deleteUserDoc = (user) => user.deleteOne();

export const findUserOne = (filter) => User.findOne(filter);

export const findUserByIdSelect = (id) => User.findById(id).select('-password').populate('class', 'name');

export const findLecturerByIdFull = (id) => User.findById(id).select('-password');

export const findUserForEmailCheck = (email, excludeId) =>
  User.findOne({ email, _id: { $ne: excludeId } });

export const findStudentsInClass = (filter) => User.find(filter);

export const updateManyUsers = (filter, update) => User.updateMany(filter, update);

export const findParents = (instituteId) =>
  User.find({ institute: instituteId, role: 'parent' })
    .select('-password')
    .populate('linkedStudents', 'fullName class studentProfile')
    .lean();

// ─── Institute ────────────────────────────────────────────────────────────────

export const findInstituteByAdmin = (adminId) => Institute.findOne({ admin: adminId });

export const createInstitute = (data) => Institute.create(data);

export const findInstituteById = (id) => Institute.findById(id).lean();

export const findInstituteByIdFull = (id) => Institute.findById(id);

export const updateInstituteByAdmin = (adminId, data) =>
  Institute.findOneAndUpdate({ admin: adminId }, data, { new: true });

// ─── Class ────────────────────────────────────────────────────────────────────

export const findClassByIdAndInstitute = (classId, institute) =>
  Class.findOne({ _id: classId, institute });

export const findClassPopulated = (classId, institute) =>
  Class.findOne({ _id: classId, institute })
    .populate('lecturer', 'fullName email role phoneNumber')
    .populate('students', 'fullName email role class studentProfile');

export const findClassWithStudents = (classId, instituteId) =>
  Class.findOne({ _id: classId, institute: instituteId }).populate('students', 'fullName email');

export const findClassesPaginated = (filter, skip, limit) =>
  Class.find(filter)
    .skip(skip)
    .limit(limit)
    .populate('lecturer', 'fullName email')
    .populate('students', 'fullName email studentProfile');

export const countClasses = (filter) => Class.countDocuments(filter);

export const updateClassById = (id, update, opts) =>
  Class.findByIdAndUpdate(id, update, opts);

export const updateManyClasses = (filter, update) => Class.updateMany(filter, update);

export const updateOneClass = (filter, update) => Class.updateOne(filter, update);

export const findClassesByLecturer = (lecturerId, instituteId) =>
  Class.find({ lecturer: lecturerId, institute: instituteId }).select('name students subjects').lean();

// ─── Subject ──────────────────────────────────────────────────────────────────

export const findSubjectsByLecturer = (lecturerId, instituteId) =>
  Subject.find({ lecturer: lecturerId, institute: instituteId }).populate('class', 'name');

export const countSubjects = (filter) => Subject.countDocuments(filter);

// ─── Assignment ───────────────────────────────────────────────────────────────

export const findAllAssignments = (instituteId) =>
  Assignment.find({ institute: instituteId }).populate('subject', 'name');

export const findPublishedAssignmentsByClass = (classId, instituteId) =>
  Assignment.find({ class: classId, institute: instituteId, status: 'published' })
    .populate('subject', 'name')
    .sort({ dueDate: 1 });

export const countAssignments = (filter) => Assignment.countDocuments(filter);

// ─── Submission ───────────────────────────────────────────────────────────────

export const findSubmissions = (filter) => Submission.find(filter);

// ─── Result ───────────────────────────────────────────────────────────────────

// termId is optional — omit for all-terms (annual view)
export const findResultsByClass = (classId, instituteId, termId) => {
  const filter = { class: classId, institute: instituteId };
  if (termId) filter.term = termId;
  return Result.find(filter)
    .populate('student', 'fullName email profilePhoto')
    .populate('subject', 'name code totalMarks')
    .populate('term', 'name academicYear');
};

export const findResultsBySubject = (subjectId, instituteId) =>
  Result.find({ subject: subjectId, institute: instituteId })
    .populate('student', 'fullName email')
    .populate('subject', 'name totalMarks');

export const findResultsByStudentAndInstitute = (studentId, instituteId) =>
  Result.find({ student: studentId, institute: instituteId })
    .populate('subject', 'name code totalMarks')
    .populate('term', 'name academicYear')
    .lean();

export const findResultsForRanking = (classId, instituteId, termId) => {
  const filter = { class: classId, institute: instituteId };
  if (termId) filter.term = termId;
  return Result.find(filter)
    .populate('student', 'fullName profilePhoto studentProfile')
    .lean();
};

export const findResultsForClassTotals = (classId, instituteId, termId) => {
  const filter = { class: classId, institute: instituteId };
  if (termId) filter.term = termId;
  return Result.find(filter).lean();
};

export const findTermsByInstitute = (instituteId) =>
  AcademicTerm.find({ institute: instituteId }).sort({ startDate: 1 }).lean();

export const findResultsByStudent = (studentId, instituteId) =>
  Result.find({ class: studentId, institute: instituteId }).lean();

export const countResults = (filter) => Result.countDocuments(filter);

// ─── FeeParticular ────────────────────────────────────────────────────────────

export const insertFees = (feeDocs) => FeeParticular.insertMany(feeDocs);

// ─── StudentFee ───────────────────────────────────────────────────────────────

export const findStudentFeesByClass = (classId, studentIds, instituteId) =>
  StudentFee.find({ class: classId, student: { $in: studentIds }, institute: instituteId }).lean();

// ─── Attendance ───────────────────────────────────────────────────────────────

export const upsertAttendance = (filter, data) =>
  Attendance.findOneAndUpdate(filter, data, { upsert: true, new: true });

export const countAttendanceByStudent = (studentId, instituteId) =>
  Attendance.countDocuments({ institute: instituteId, 'records.student': studentId });

export const countAttendancePresentByStudent = (studentId, instituteId) =>
  Attendance.countDocuments({ institute: instituteId, records: { $elemMatch: { student: studentId, status: 'present' } } });

export const findAttendanceForReportCard = (instituteId) =>
  Attendance.find({ institute: instituteId }).lean();

export const findAttendanceForPromotion = (classId, instituteId) =>
  Attendance.find({ class: classId, institute: instituteId, type: 'student' }).lean();

export const countAttendanceByInstitute = (id) => Attendance.countDocuments({ institute: id });
