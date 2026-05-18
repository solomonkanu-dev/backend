import Plan from '../models/Plan.js';
import Institute from '../models/Institute.js';
import PlanPayment from '../models/PlanPayment.js';
import AcademicTerm from '../models/AcademicTerm.js';
import User from '../models/user.js';

// ─── Plans ────────────────────────────────────────────────────────────────────

export const findAll = () => Plan.find().sort({ price: 1 });

export const findById = (id) => Plan.findById(id);

export const findByIdAndUpdate = (id, update) =>
  Plan.findByIdAndUpdate(id, update, { new: true });

export const findByName = (name) => Plan.findOne({ name });

export const updateInstituteWithPlan = (instituteId, update) =>
  Institute.findByIdAndUpdate(instituteId, update, { new: true }).populate('plan');

export const findInstituteById = (id) => Institute.findById(id).populate('plan');

// ─── Terms & counts ───────────────────────────────────────────────────────────

export const findCurrentTerm = (instituteId) =>
  AcademicTerm.findOne({ institute: instituteId, isCurrent: true });

export const findTermById = (id) => AcademicTerm.findById(id);

export const countStudents = (instituteId) =>
  User.countDocuments({ institute: instituteId, role: 'student' });

// ─── Plan payments ────────────────────────────────────────────────────────────

export const createPlanPayment = (data) => PlanPayment.create(data);

export const findPlanPaymentById = (id) => PlanPayment.findById(id);

export const findPlanPaymentBySession = (sessionId) =>
  PlanPayment.findOne({ monimeSessionId: sessionId });

export const countCompletedPlanPayments = () =>
  PlanPayment.countDocuments({ status: 'completed' });

export const findPlanPaymentsByInstitute = (instituteId) =>
  PlanPayment.find({ institute: instituteId })
    .sort({ createdAt: -1 })
    .populate('plan', 'name displayName price')
    .populate('term', 'name academicYear');

export const findPlanPaymentForReceipt = (id) =>
  PlanPayment.findById(id)
    .populate('plan', 'name displayName price')
    .populate('term', 'name academicYear startDate endDate')
    .populate('recordedBy', 'fullName email');
