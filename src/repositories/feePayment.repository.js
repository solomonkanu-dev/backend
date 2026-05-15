import FeePayment from '../models/FeePayment.js';
import StudentFee from '../models/StudentFee.js';

export const countByInstitute = (instituteId) =>
  FeePayment.countDocuments({ institute: instituteId });

export const createPayment = (data) => FeePayment.create(data);

export const findPaymentsByStudent = (studentId, instituteId) =>
  FeePayment.find({ student: studentId, institute: instituteId })
    .populate('recordedBy', 'fullName')
    .sort({ createdAt: -1 })
    .lean();

export const findPaymentById = (paymentId, instituteId) =>
  FeePayment.findOne({ _id: paymentId, institute: instituteId })
    .populate('student', 'fullName email profilePhoto studentProfile class')
    .populate({ path: 'student', populate: { path: 'class', select: 'name' } })
    .populate('recordedBy', 'fullName')
    .lean();

export const findStudentFee = (studentId, instituteId) =>
  StudentFee.findOne({ student: studentId, institute: instituteId });

export const findStudentFeeById = (feeId) =>
  StudentFee.findById(feeId).lean();

export const findMyPayments = (studentId) =>
  FeePayment.find({ student: studentId })
    .populate('recordedBy', 'fullName')
    .sort({ createdAt: -1 })
    .lean();

export const findMyPaymentReceipt = (paymentId, studentId) =>
  FeePayment.findOne({ _id: paymentId, student: studentId })
    .populate('recordedBy', 'fullName')
    .lean();
