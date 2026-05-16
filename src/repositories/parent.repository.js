import User from '../models/user.js';
import Attendance from '../models/Attendance.js';
import Result from '../models/Result.js';
import StudentFee from '../models/StudentFee.js';
import Announcement from '../models/Announcement.js';
import Assignment from '../models/Assignment.js';

export const findLinkedStudents = (linkedStudentIds) =>
  User.find({ _id: { $in: linkedStudentIds } })
    .select('fullName email class profilePhoto studentProfile')
    .populate('class', 'name');

export const findStudentById = (studentId) =>
  User.findById(studentId).select('class').lean();

export const findAttendanceForStudent = (filter) =>
  Attendance.find(filter).sort({ date: -1 }).limit(30).lean();

export const findResultsForStudent = (filter) =>
  Result.find(filter)
    .populate('subject', 'name')
    .populate('class', 'name')
    .lean();

export const findStudentWithPromotion = (studentId) =>
  User.findById(studentId)
    .select('fullName class promotionHistory')
    .populate('class', 'name')
    .populate('promotionHistory.fromClass', 'name')
    .populate('promotionHistory.toClass', 'name')
    .lean();

export const findStudentFees = (filter) =>
  StudentFee.find(filter).lean();

export const findAnnouncements = (instituteId) =>
  Announcement.find({
    institute: instituteId,
    targetRoles: { $in: ['parent', 'student'] },
  })
    .sort({ createdAt: -1 })
    .limit(20);

export const findAssignmentsForClass = (classId, instituteId) =>
  Assignment.find({ class: classId, institute: instituteId, status: 'published' })
    .populate('subject', 'name code')
    .populate('lecturer', 'fullName')
    .sort({ dueDate: 1 })
    .lean();
