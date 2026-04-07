import User from '../models/user.js';
import Attendance from '../models/Attendance.js';
import Result from '../models/Result.js';
import StudentFee from '../models/StudentFee.js';
import Announcement from '../models/Announcement.js';

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
  StudentFee.find(filter).populate('fees.fee', 'title amount').lean();

export const findAnnouncements = (instituteId) =>
  Announcement.find({
    institute: instituteId,
    targetRoles: { $in: ['parent', 'student'] },
  })
    .sort({ createdAt: -1 })
    .limit(20);
