
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/user.js';
import Institute from '../models/Institute.js';
import { logAudit } from '../utils/audit.js';
import StudentFee from '../models/StudentFee.js';
import Salary from '../models/Salary.js';
import Attendance from '../models/Attendance.js';
import Class from '../models/Class.js';
import Subject from '../models/Subject.js';
import Assignment from '../models/Assignment.js';
import Result from '../models/Result.js';

const isDev = process.env.NODE_ENV === 'development';



export const superAdminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email, role: 'super_admin' });
    if (!user) {
      return res.status(401).json({
        message: 'Invalid credentials',
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        message: 'Invalid credentials',
      });
    }

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      message: 'Super admin login successful',
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const approveAdmin = async (req, res) => {
  try {
    const { adminId } = req.params;

    const admin = await User.findByIdAndUpdate(
      adminId,
      { approved: true },
      { new: true }
    );

    if (!admin) return res.status(404).json({ message: 'User not found' });

    logAudit(req, { action: "APPROVE_ADMIN", entity: "User", entityId: admin._id, description: `Approved admin ${admin.fullName} (${admin.email})`, statusCode: 200 });

    res.json({ message: 'User approved successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getPendingAdmins = async (req, res) => {
  try {
    const pendingAdmins = await User.find({
      role: 'admin',
      approved: false,
    }).select('-password').sort({createdAt: -1});

    res.status(200).json({
      message: 'Pending admin requests',
      total: pendingAdmins.length,
      data: pendingAdmins,
    });
    // res.json(pendingAdmins);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getSystemStats = async (req, res) => {
  try {
    const totalAdmins = await User.countDocuments();
    const approvedAdmins = await User.countDocuments({ approved: true });
    const pendingAdmins = await User.countDocuments({ approved: false });
    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalLecturers = await User.countDocuments({ role: 'lecturer' });

    const totalInstitutes = await Institute.countDocuments();

    res.status(200).json({
      message: 'System statistics',
      data: {
        admins: {
          total: totalAdmins,
          approved: approvedAdmins,
          pending: pendingAdmins,
        },
        institutes: {
          total: totalInstitutes,
        },
        students: {
          total: totalStudents,
        },
        lecturers: {
          total: totalLecturers,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch system stats',
      error: error.message,
    });
  }
};


export const getAllInstitutes = async (req, res) => {
  try {
    const institutes = await Institute.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: institutes.length,
      data: institutes,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch institutes",
      error: error.message,
    });
  }
};

export const getAllAdmins = async (req, res) => {
  try {
    const admins = await User.find({ role: "admin" })
      .select("-password")
      .populate("institute", "name")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, total: admins.length, data: admins });
  } catch (error) {
    const isDev = process.env.NODE_ENV === "development";
    res.status(500).json({ success: false, message: isDev ? error.message : "Internal server error" });
  }
};

export const suspendAdmin = async (req, res) => {
  try {
    const { adminId } = req.params;

    const admin = await User.findOne({ _id: adminId, role: "admin" });
    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }

    if (!admin.isActive) {
      return res.status(400).json({ success: false, message: "Account is already suspended" });
    }

    admin.isActive = false;
    await admin.save();

    logAudit(req, { action: "SUSPEND_ADMIN", entity: "User", entityId: admin._id, description: `Suspended admin ${admin.fullName} (${admin.email})`, statusCode: 200 });

    res.json({ success: true, message: "Admin account suspended successfully" });
  } catch (error) {
    const isDev = process.env.NODE_ENV === "development";
    res.status(500).json({ success: false, message: isDev ? error.message : "Internal server error" });
  }
};

export const unsuspendAdmin = async (req, res) => {
  try {
    const { adminId } = req.params;

    const admin = await User.findOne({ _id: adminId, role: "admin" });
    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }

    if (admin.isActive) {
      return res.status(400).json({ success: false, message: "Account is already active" });
    }

    admin.isActive = true;
    await admin.save();

    logAudit(req, { action: "UNSUSPEND_ADMIN", entity: "User", entityId: admin._id, description: `Unsuspended admin ${admin.fullName} (${admin.email})`, statusCode: 200 });

    res.json({ success: true, message: "Admin account unsuspended successfully" });
  } catch (error) {
    const isDev = process.env.NODE_ENV === "development";
    res.status(500).json({ success: false, message: isDev ? error.message : "Internal server error" });
  }
};

/**
 * GET /api/v1/super-admin/monitor/overview
 * System-wide dashboard — users, institutes, fees, salaries at a glance
 */
export const getSystemOverview = async (req, res) => {
  try {
    const [
      totalInstitutes,
      activeInstitutes,
      totalAdmins,
      activeAdmins,
      suspendedAdmins,
      pendingAdmins,
      totalStudents,
      activeStudents,
      totalLecturers,
      activeLecturers,
      feeStats,
      salaryStats,
    ] = await Promise.all([
      Institute.countDocuments(),
      Institute.countDocuments({ isActive: true }),
      User.countDocuments({ role: 'admin' }),
      User.countDocuments({ role: 'admin', isActive: true }),
      User.countDocuments({ role: 'admin', isActive: false }),
      User.countDocuments({ role: 'admin', approved: false }),
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'student', isActive: true }),
      User.countDocuments({ role: 'lecturer' }),
      User.countDocuments({ role: 'lecturer', isActive: true }),
      StudentFee.aggregate([
        {
          $group: {
            _id: null,
            totalBilled: { $sum: '$totalAmount' },
            totalCollected: { $sum: { $subtract: ['$totalAmount', '$balance'] } },
            totalOutstanding: { $sum: '$balance' },
          },
        },
      ]),
      Salary.aggregate([
        {
          $group: {
            _id: null,
            totalPaid: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$totalAmount', 0] } },
            totalPending: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'pending'] }, '$totalAmount', 0] } },
            totalDisbursed: { $sum: '$totalAmount' },
          },
        },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        institutes: { total: totalInstitutes, active: activeInstitutes, inactive: totalInstitutes - activeInstitutes },
        admins: { total: totalAdmins, active: activeAdmins, suspended: suspendedAdmins, pending: pendingAdmins },
        students: { total: totalStudents, active: activeStudents, suspended: totalStudents - activeStudents },
        lecturers: { total: totalLecturers, active: activeLecturers, suspended: totalLecturers - activeLecturers },
        fees: feeStats[0] || { totalBilled: 0, totalCollected: 0, totalOutstanding: 0 },
        salaries: salaryStats[0] || { totalPaid: 0, totalPending: 0, totalDisbursed: 0 },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: isDev ? error.message : 'Internal server error' });
  }
};

/**
 * GET /api/v1/super-admin/monitor/institutes
 * Per-institute breakdown — user counts, fee collection, class/subject counts
 */
export const getInstituteHealthReport = async (req, res) => {
  try {
    const institutes = await Institute.find().lean();

    const reports = await Promise.all(
      institutes.map(async (institute) => {
        const id = institute._id;

        const [students, lecturers, admins, classes, subjects, feeStats, salaryStats] = await Promise.all([
          User.countDocuments({ institute: id, role: 'student' }),
          User.countDocuments({ institute: id, role: 'lecturer' }),
          User.countDocuments({ institute: id, role: 'admin' }),
          Class.countDocuments({ institute: id }),
          Subject.countDocuments({ institute: id }),
          StudentFee.aggregate([
            { $match: { institute: new mongoose.Types.ObjectId(id) } },
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
            { $match: { institute: new mongoose.Types.ObjectId(id) } },
            {
              $group: {
                _id: null,
                totalDisbursed: { $sum: '$totalAmount' },
              },
            },
          ]),
        ]);

        return {
          institute: { id: institute._id, name: institute.name, email: institute.email },
          users: { students, lecturers, admins },
          academics: { classes, subjects },
          fees: feeStats[0] || { totalBilled: 0, totalCollected: 0, outstanding: 0, paidCount: 0, unpaidCount: 0 },
          salaries: salaryStats[0] || { totalDisbursed: 0 },
        };
      })
    );

    res.json({ success: true, total: reports.length, data: reports });
  } catch (error) {
    res.status(500).json({ success: false, message: isDev ? error.message : 'Internal server error' });
  }
};

/**
 * GET /api/v1/super-admin/monitor/growth?months=6
 * System growth trends — new institutes, admins, students, lecturers per month
 */
export const getGrowthTrends = async (req, res) => {
  try {
    const months = Math.min(parseInt(req.query.months) || 6, 24);
    const since = new Date();
    since.setMonth(since.getMonth() - (months - 1));
    since.setDate(1);
    since.setHours(0, 0, 0, 0);

    const groupByMonth = (collection, matchFilter = {}) =>
      collection.aggregate([
        { $match: { ...matchFilter, createdAt: { $gte: since } } },
        { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
        { $project: { _id: 0, year: '$_id.year', month: '$_id.month', count: 1 } },
      ]);

    const [institutes, admins, students, lecturers] = await Promise.all([
      groupByMonth(Institute),
      groupByMonth(User, { role: 'admin' }),
      groupByMonth(User, { role: 'student' }),
      groupByMonth(User, { role: 'lecturer' }),
    ]);

    res.json({
      success: true,
      data: { institutes, admins, students, lecturers },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: isDev ? error.message : 'Internal server error' });
  }
};

/**
 * GET /api/v1/super-admin/monitor/fee-revenue
 * System-wide fee revenue breakdown across all institutes
 */
export const getFeeRevenueReport = async (req, res) => {
  try {
    const [summary, byStatus, topInstitutes] = await Promise.all([
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

    res.json({
      success: true,
      data: {
        summary: summary[0] || {},
        byStatus,
        topInstitutes,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: isDev ? error.message : 'Internal server error' });
  }
};

/**
 * GET /api/v1/super-admin/monitor/salary-expenditure
 * System-wide salary expenditure across all institutes
 */
export const getSalaryExpenditureReport = async (req, res) => {
  try {
    const [summary, byStatus, byInstitute] = await Promise.all([
      Salary.aggregate([
        {
          $group: {
            _id: null,
            totalDisbursed: { $sum: '$totalAmount' },
            totalPaid: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$totalAmount', 0] } },
            totalPending: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'pending'] }, '$totalAmount', 0] } },
            totalRecords: { $sum: 1 },
            paidCount: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, 1, 0] } },
            pendingCount: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'pending'] }, 1, 0] } },
          },
        },
        { $project: { _id: 0 } },
      ]),
      Salary.aggregate([
        { $group: { _id: '$paymentStatus', count: { $sum: 1 }, totalAmount: { $sum: '$totalAmount' } } },
        { $project: { _id: 0, status: '$_id', count: 1, totalAmount: 1 } },
      ]),
      Salary.aggregate([
        {
          $group: {
            _id: '$institute',
            totalDisbursed: { $sum: '$totalAmount' },
            totalPaid: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$totalAmount', 0] } },
            totalPending: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'pending'] }, '$totalAmount', 0] } },
            staffCount: { $addToSet: '$lecturer' },
          },
        },
        { $lookup: { from: 'institutes', localField: '_id', foreignField: '_id', as: 'institute' } },
        { $unwind: '$institute' },
        {
          $project: {
            _id: 0,
            instituteName: '$institute.name',
            totalDisbursed: 1,
            totalPaid: 1,
            totalPending: 1,
            staffCount: { $size: '$staffCount' },
          },
        },
        { $sort: { totalDisbursed: -1 } },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        summary: summary[0] || {},
        byStatus,
        byInstitute,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: isDev ? error.message : 'Internal server error' });
  }
};

/**
 * GET /api/v1/super-admin/monitor/institutes/:instituteId
 * Deep-dive report for a single institute
 */
export const getInstituteDeepReport = async (req, res) => {
  try {
    const { instituteId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(instituteId)) {
      return res.status(400).json({ success: false, message: 'Invalid institute ID' });
    }

    const institute = await Institute.findById(instituteId);
    if (!institute) {
      return res.status(404).json({ success: false, message: 'Institute not found' });
    }

    const id = new mongoose.Types.ObjectId(instituteId);

    const [
      userStats,
      classCount,
      subjectCount,
      assignmentCount,
      resultCount,
      feeStats,
      salaryStats,
      attendanceDays,
    ] = await Promise.all([
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

    res.json({
      success: true,
      data: {
        institute: { id: institute._id, name: institute.name, email: institute.email, createdAt: institute.createdAt },
        users: userStats,
        academics: { classes: classCount, subjects: subjectCount, assignments: assignmentCount, results: resultCount, attendanceRecords: attendanceDays },
        fees: feeStats[0] || { totalBilled: 0, totalCollected: 0, outstanding: 0, paidCount: 0, partialCount: 0, unpaidCount: 0 },
        salaries: salaryStats[0] || { totalDisbursed: 0, totalPaid: 0, totalPending: 0 },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: isDev ? error.message : 'Internal server error' });
  }
};

export const getInstituteById = async (req, res) => {
  try {
    const institute = await Institute.findById(req.params.id);

    if (!institute) {
      return res.status(404).json({
        success: false,
        message: "Institute not found",
      });
    }

    res.status(200).json({
      success: true,
      data: institute,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch institute",
      error: error.message,
    });
  }
};
