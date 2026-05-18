import User from '../models/user.js';
import Institute from '../models/Institute.js';
import StudentFee from '../models/StudentFee.js';
import Salary from '../models/Salary.js';
import Class from '../models/Class.js';
import Subject from '../models/Subject.js';
import Assignment from '../models/Assignment.js';
import Result from '../models/Result.js';
import Attendance from '../models/Attendance.js';
import Submission from '../models/Submission.js';
import Plan from '../models/Plan.js'; // imported so .populate('plan') has a registered schema
import mongoose from 'mongoose';

// Touch Plan so linters/bundlers keep the import that registers the schema.
void Plan;

export const findUserById = (id) => User.findById(id);

export const findUserByEmail = (email, role) => User.findOne({ email, role });

export const approveUserById = (id) =>
  User.findByIdAndUpdate(id, { approved: true }, { new: true });

export const findPendingAdmins = () =>
  User.find({ role: 'admin', approved: false }).select('-password').sort({ createdAt: -1 });

export const countUsers = (filter) => User.countDocuments(filter);

export const countInstitutes = (filter) => Institute.countDocuments(filter ?? {});

export const findAllInstitutes = () => Institute.find().sort({ createdAt: -1 });

export const findAllAdmins = () =>
  User.find({ role: 'admin' })
    .select('-password')
    .populate('institute', 'name')
    .sort({ createdAt: -1 });

export const findAdminById = (id) => User.findOne({ _id: id, role: 'admin' });

export const saveUser = (user) => user.save();

export const aggregateFeeStats = () =>
  StudentFee.aggregate([
    {
      $group: {
        _id: null,
        totalBilled: { $sum: '$totalAmount' },
        totalCollected: { $sum: { $subtract: ['$totalAmount', '$balance'] } },
        totalOutstanding: { $sum: '$balance' },
      },
    },
  ]);

export const aggregateSalaryStats = () =>
  Salary.aggregate([
    {
      $group: {
        _id: null,
        totalPaid: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$totalAmount', 0] } },
        totalPending: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'pending'] }, '$totalAmount', 0] } },
        totalDisbursed: { $sum: '$totalAmount' },
      },
    },
  ]);

export const findAllInstitutesLean = () => Institute.find().lean();

export const getInstituteReport = async (id) => {
  const oid = new mongoose.Types.ObjectId(id);
  return Promise.all([
    User.countDocuments({ institute: id, role: 'student' }),
    User.countDocuments({ institute: id, role: 'lecturer' }),
    User.countDocuments({ institute: id, role: 'admin' }),
    Class.countDocuments({ institute: id }),
    Subject.countDocuments({ institute: id }),
    StudentFee.aggregate([
      { $match: { institute: oid } },
      {
        $group: {
          _id: null,
          totalBilled: { $sum: '$totalAmount' },
          totalCollected: { $sum: { $subtract: ['$totalAmount', '$balance'] } },
          outstanding: { $sum: '$balance' },
          paidCount: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] } },
          unpaidCount: { $sum: { $cond: [{ $eq: ['$status', 'unpaid'] }, 1, 0] } },
        },
      },
    ]),
    Salary.aggregate([
      { $match: { institute: oid } },
      { $group: { _id: null, totalDisbursed: { $sum: '$totalAmount' } } },
    ]),
  ]);
};

export const aggregateGrowthByMonth = (collection, matchFilter, since) =>
  collection.aggregate([
    { $match: { ...matchFilter, createdAt: { $gte: since } } },
    { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, count: { $sum: 1 } } },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
    { $project: { _id: 0, year: '$_id.year', month: '$_id.month', count: 1 } },
  ]);

export const aggregateFeeRevenue = () =>
  Promise.all([
    StudentFee.aggregate([
      {
        $group: {
          _id: null,
          totalBilled: { $sum: '$totalAmount' },
          totalCollected: { $sum: { $subtract: ['$totalAmount', '$balance'] } },
          totalOutstanding: { $sum: '$balance' },
          totalRecords: { $sum: 1 },
          paidCount: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] } },
          partialCount: { $sum: { $cond: [{ $eq: ['$status', 'partial'] }, 1, 0] } },
          unpaidCount: { $sum: { $cond: [{ $eq: ['$status', 'unpaid'] }, 1, 0] } },
        },
      },
      {
        $project: {
          _id: 0,
          totalBilled: 1,
          totalCollected: 1,
          totalOutstanding: 1,
          totalRecords: 1,
          paidCount: 1,
          partialCount: 1,
          unpaidCount: 1,
          collectionRate: {
            $cond: [
              { $gt: ['$totalBilled', 0] },
              { $round: [{ $multiply: [{ $divide: ['$totalCollected', '$totalBilled'] }, 100] }, 2] },
              0,
            ],
          },
        },
      },
    ]),
    StudentFee.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 }, totalAmount: { $sum: '$totalAmount' }, outstanding: { $sum: '$balance' } } },
      { $project: { _id: 0, status: '$_id', count: 1, totalAmount: 1, outstanding: 1 } },
    ]),
    StudentFee.aggregate([
      {
        $group: {
          _id: '$institute',
          totalBilled: { $sum: '$totalAmount' },
          totalCollected: { $sum: { $subtract: ['$totalAmount', '$balance'] } },
          outstanding: { $sum: '$balance' },
        },
      },
      { $lookup: { from: 'institutes', localField: '_id', foreignField: '_id', as: 'institute' } },
      { $unwind: '$institute' },
      { $project: { _id: 0, instituteName: '$institute.name', totalBilled: 1, totalCollected: 1, outstanding: 1 } },
      { $sort: { totalCollected: -1 } },
      { $limit: 10 },
    ]),
  ]);

export const getInstituteDeepData = async (instituteId) => {
  const id = new mongoose.Types.ObjectId(instituteId);
  return Promise.all([
    User.aggregate([
      { $match: { institute: id } },
      {
        $group: {
          _id: '$role',
          total: { $sum: 1 },
          active: { $sum: { $cond: ['$isActive', 1, 0] } },
          suspended: { $sum: { $cond: ['$isActive', 0, 1] } },
        },
      },
      { $project: { _id: 0, role: '$_id', total: 1, active: 1, suspended: 1 } },
    ]),
    Class.countDocuments({ institute: id }),
    Subject.countDocuments({ institute: id }),
    Assignment.countDocuments({ institute: id }),
    Result.countDocuments({ institute: id }),
    StudentFee.aggregate([
      { $match: { institute: id } },
      {
        $group: {
          _id: null,
          totalBilled: { $sum: '$totalAmount' },
          totalCollected: { $sum: { $subtract: ['$totalAmount', '$balance'] } },
          outstanding: { $sum: '$balance' },
          paidCount: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] } },
          partialCount: { $sum: { $cond: [{ $eq: ['$status', 'partial'] }, 1, 0] } },
          unpaidCount: { $sum: { $cond: [{ $eq: ['$status', 'unpaid'] }, 1, 0] } },
        },
      },
      { $project: { _id: 0 } },
    ]),
    Salary.aggregate([
      { $match: { institute: id } },
      {
        $group: {
          _id: null,
          totalDisbursed: { $sum: '$totalAmount' },
          totalPaid: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$totalAmount', 0] } },
          totalPending: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'pending'] }, '$totalAmount', 0] } },
        },
      },
      { $project: { _id: 0 } },
    ]),
    Attendance.countDocuments({ institute: id }),
  ]);
};

export const findAdminsPaginated = (filter, skip, limit) =>
  User.find(filter)
    .select('-password')
    .populate('institute', 'name')
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

export const findInstituteById = (id) => Institute.findById(id);

export const findAdminOnboarding = (id) =>
  User.findOne({ _id: id, role: 'admin' })
    .select('-password')
    .populate('institute', 'name')
    .populate('onboarding.transitions.changedBy', 'fullName email role');

// ─── Subscriptions ────────────────────────────────────────────────────────────

// Every institute with its plan populated. The dataset is small (one row per
// institute) so the subscription math is done in the service layer.
export const findInstitutesWithPlan = () =>
  Institute.find().populate('plan').lean();

// ─── Academics ────────────────────────────────────────────────────────────────

export const countClassesAll = () => Class.countDocuments({});

export const countSubjectsAll = () => Subject.countDocuments({});

export const countAssignmentsSince = (since) =>
  Assignment.countDocuments({ createdAt: { $gte: since } });

export const countResultsPublishedSince = (since) =>
  Result.countDocuments({ isPublished: true, createdAt: { $gte: since } });

export const aggregateSubmissionStats = (since) =>
  Submission.aggregate([
    { $match: { createdAt: { $gte: since } } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

export const aggregateSubmissionsByInstitute = (since) =>
  Submission.aggregate([
    { $match: { createdAt: { $gte: since } } },
    { $group: { _id: { institute: '$institute', status: '$status' }, count: { $sum: 1 } } },
  ]);

// Student attendance is stored as one doc per session with a `records` array,
// so the rate is computed by unwinding the per-student records.
export const aggregateAttendanceRate = (since) =>
  Attendance.aggregate([
    { $match: { type: 'student', date: { $gte: since } } },
    { $unwind: '$records' },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        present: { $sum: { $cond: [{ $eq: ['$records.status', 'present'] }, 1, 0] } },
      },
    },
  ]);

export const aggregateAttendanceTrend = (since) =>
  Attendance.aggregate([
    { $match: { type: 'student', date: { $gte: since } } },
    { $unwind: '$records' },
    {
      $group: {
        _id: { year: { $year: '$date' }, month: { $month: '$date' } },
        total: { $sum: 1 },
        present: { $sum: { $cond: [{ $eq: ['$records.status', 'present'] }, 1, 0] } },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

export const aggregateAttendanceByInstitute = (since) =>
  Attendance.aggregate([
    { $match: { type: 'student', date: { $gte: since } } },
    { $unwind: '$records' },
    {
      $group: {
        _id: '$institute',
        total: { $sum: 1 },
        present: { $sum: { $cond: [{ $eq: ['$records.status', 'present'] }, 1, 0] } },
      },
    },
  ]);

export const aggregateGradeDistribution = (since) =>
  Result.aggregate([
    { $match: { isPublished: true, createdAt: { $gte: since }, grade: { $nin: [null, ''] } } },
    { $group: { _id: '$grade', count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

// `fails` uses a grade-letter heuristic: a result is a fail when its grade
// starts with "F" (covers "F", "Fail", "F9"). The data model has no explicit
// pass mark, so this is the platform-wide proxy.
export const aggregateResultsByInstitute = (since) =>
  Result.aggregate([
    { $match: { isPublished: true, createdAt: { $gte: since }, grade: { $nin: [null, ''] } } },
    {
      $group: {
        _id: '$institute',
        total: { $sum: 1 },
        fails: {
          $sum: {
            $cond: [{ $regexMatch: { input: '$grade', regex: '^f', options: 'i' } }, 1, 0],
          },
        },
      },
    },
  ]);

export const countStudentsByInstitute = () =>
  User.aggregate([
    { $match: { role: 'student' } },
    { $group: { _id: '$institute', count: { $sum: 1 } } },
  ]);

export const countClassesByInstitute = () =>
  Class.aggregate([{ $group: { _id: '$institute', count: { $sum: 1 } } }]);
