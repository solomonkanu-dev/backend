import User from '../models/user.js';
import Institute from '../models/Institute.js';
import Result from '../models/Result.js';
import AcademicTerm from '../models/AcademicTerm.js';
import StudentFee from '../models/StudentFee.js';
import Attendance from '../models/Attendance.js';
import FeePayment from '../models/FeePayment.js';

export const findAll = () => User.find({ role: 'student' }).populate('institute', 'name');

export const findById = (id) => User.findById(id).populate('institute', 'name');

export const findMyFees = (filter) =>
  StudentFee.find(filter).populate('class', 'name').lean();

export const findMyResults = (filter) =>
  Result.find(filter)
    .populate('subject', 'name code totalMarks caTotal examTotal')
    .populate('class', 'name')
    .populate('term', 'name academicYear')
    .lean();

export const findMyPromotionHistory = (userId) =>
  User.findById(userId)
    .select('class promotionHistory')
    .populate('class', 'name')
    .populate('promotionHistory.fromClass', 'name')
    .populate('promotionHistory.toClass', 'name')
    .lean();

export const findMyReportCardData = (studentId) =>
  User.findById(studentId).populate({ path: 'class', select: 'name lecturer', populate: { path: 'lecturer', select: 'fullName' } }).lean();

export const findInstituteById = (id) => Institute.findById(id).lean();

export const findResultsForReportCard = (studentId, instituteId) =>
  Result.find({ student: studentId, institute: instituteId })
    .populate('subject', 'name code totalMarks caTotal examTotal')
    .populate('term', 'name academicYear')
    .lean();

export const findTermsByInstitute = (instituteId) =>
  AcademicTerm.find({ institute: instituteId }).sort({ startDate: 1 }).lean();

export const findStudentAttendance = (studentId, instituteId) =>
  Attendance.find({ institute: instituteId, 'records.student': studentId }).lean();

export const findClassResults = (classId, instituteId) =>
  Result.find({ class: classId, institute: instituteId }).lean();

export const findMyPayments = (studentId, instituteId) =>
  FeePayment.find({ student: studentId, institute: instituteId }).sort({ createdAt: -1 }).lean();

export const findPaymentReceipt = (paymentId, studentId, instituteId) =>
  FeePayment.findOne({ _id: paymentId, student: studentId, institute: instituteId })
    .populate({
      path: 'student',
      select: 'fullName email profilePhoto studentProfile class',
      populate: { path: 'class', select: 'name' },
    })
    .populate('recordedBy', 'fullName')
    .lean();

export const findStudentFeeOne = (studentId, instituteId) =>
  StudentFee.findOne({ student: studentId, institute: instituteId })
    .lean();

export const findAllPaymentsForFullReceipt = (studentId, instituteId) =>
  FeePayment.find({ student: studentId, institute: instituteId })
    .populate('recordedBy', 'fullName')
    .sort({ createdAt: 1 })
    .lean();

export const findResultsForRanking = (classId, instituteId, termId) => {
  const filter = { class: classId, institute: instituteId };
  if (termId) filter.term = termId;
  return Result.find(filter).lean();
};
