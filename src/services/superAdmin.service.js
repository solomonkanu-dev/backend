import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import * as repo from '../repositories/superAdmin.repository.js';
import Institute from '../models/Institute.js';
import User from '../models/user.js';
import Class from '../models/Class.js';
import Subject from '../models/Subject.js';
import { AppError } from '../errors/AppError.js';
import { logAudit } from '../utils/audit.js';
import { notify } from '../utils/notify.js';
import OnlineUserReport from '../models/OnlineUserReport.js';

export const superAdminLogin = async ({ email, password }) => {
  const user = await repo.findUserByEmail(email, 'super_admin');
  if (!user) throw new AppError('Invalid credentials', 401);

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new AppError('Invalid credentials', 401);

  const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });

  return {
    token,
    user: { _id: user._id, fullName: user.fullName, email: user.email, role: user.role },
  };
};

export const deletePendingAdmin = async (adminId, req) => {
  const admin = await User.findOne({ _id: adminId, approved: false, role: 'admin' });
  if (!admin) throw new AppError('Pending admin request not found', 404);

  await User.deleteOne({ _id: adminId });

  logAudit(req, {
    action: 'DELETE',
    entity: 'User',
    entityId: adminId,
    description: `Deleted pending admin request for ${admin.fullName} (${admin.email})`,
    statusCode: 200,
  });
};

export const approveAdmin = async (adminId, req) => {
  const admin = await repo.approveUserById(adminId);
  if (!admin) throw new AppError('User not found', 404);

  logAudit(req, {
    action: 'APPROVE_ADMIN',
    entity: 'User',
    entityId: admin._id,
    description: `Approved admin ${admin.fullName} (${admin.email})`,
    before: { approved: false },
    after:  { approved: true },
    statusCode: 200,
  });
};

export const getPendingAdmins = () => repo.findPendingAdmins();

export const getSystemStats = async () => {
  const [totalAdmins, approvedAdmins, pendingAdmins, totalStudents, totalLecturers, totalInstitutes] =
    await Promise.all([
      repo.countUsers({ role: 'admin' }),
      repo.countUsers({ role: 'admin', approved: true }),
      repo.countUsers({ role: 'admin', approved: false }),
      repo.countUsers({ role: 'student' }),
      repo.countUsers({ role: 'lecturer' }),
      repo.countInstitutes(),
    ]);

  return {
    admins: { total: totalAdmins, approved: approvedAdmins, pending: pendingAdmins },
    institutes: { total: totalInstitutes },
    students: { total: totalStudents },
    lecturers: { total: totalLecturers },
  };
};

export const getAllInstitutes = () => repo.findAllInstitutes();

export const getAllAdmins = () => repo.findAllAdmins();

export const suspendAdmin = async (adminId, req) => {
  const admin = await repo.findAdminById(adminId);
  if (!admin) throw new AppError('Admin not found', 404);
  if (!admin.isActive) throw new AppError('Account is already suspended', 400);

  admin.isActive = false;
  await repo.saveUser(admin);

  logAudit(req, {
    action: 'SUSPEND_ADMIN',
    entity: 'User',
    entityId: admin._id,
    description: `Suspended admin ${admin.fullName} (${admin.email})`,
    before: { isActive: true },
    after:  { isActive: false },
    statusCode: 200,
  });
};

export const unsuspendAdmin = async (adminId, req) => {
  const admin = await repo.findAdminById(adminId);
  if (!admin) throw new AppError('Admin not found', 404);
  if (admin.isActive) throw new AppError('Account is already active', 400);

  admin.isActive = true;
  await repo.saveUser(admin);

  logAudit(req, {
    action: 'UNSUSPEND_ADMIN',
    entity: 'User',
    entityId: admin._id,
    description: `Unsuspended admin ${admin.fullName} (${admin.email})`,
    before: { isActive: false },
    after:  { isActive: true },
    statusCode: 200,
  });
};

export const getSystemOverview = async () => {
  const [
    totalInstitutes, activeInstitutes,
    totalAdmins, activeAdmins, suspendedAdmins, pendingAdmins,
    totalStudents, activeStudents,
    totalLecturers, activeLecturers,
    feeStats, salaryStats,
  ] = await Promise.all([
    repo.countInstitutes(),
    repo.countInstitutes({ onboardingCompleted: true }),
    repo.countUsers({ role: 'admin' }),
    repo.countUsers({ role: 'admin', isActive: true }),
    repo.countUsers({ role: 'admin', isActive: false }),
    repo.countUsers({ role: 'admin', approved: false }),
    repo.countUsers({ role: 'student' }),
    repo.countUsers({ role: 'student', isActive: true }),
    repo.countUsers({ role: 'lecturer' }),
    repo.countUsers({ role: 'lecturer', isActive: true }),
    repo.aggregateFeeStats(),
    repo.aggregateSalaryStats(),
  ]);

  return {
    institutes: { total: totalInstitutes, active: activeInstitutes, inactive: totalInstitutes - activeInstitutes },
    admins: { total: totalAdmins, active: activeAdmins, suspended: suspendedAdmins, pending: pendingAdmins },
    students: { total: totalStudents, active: activeStudents, suspended: totalStudents - activeStudents },
    lecturers: { total: totalLecturers, active: activeLecturers, suspended: totalLecturers - activeLecturers },
    fees: feeStats[0] || { totalBilled: 0, totalCollected: 0, totalOutstanding: 0 },
    salaries: salaryStats[0] || { totalPaid: 0, totalPending: 0, totalDisbursed: 0 },
  };
};

export const getInstituteHealthReport = async () => {
  const institutes = await repo.findAllInstitutesLean();

  return Promise.all(
    institutes.map(async (institute) => {
      const [students, lecturers, admins, classes, subjects, feeStats, salaryStats] =
        await repo.getInstituteReport(institute._id);

      return {
        institute: { id: institute._id, name: institute.name, email: institute.email },
        users: { students, lecturers, admins },
        academics: { classes, subjects },
        fees: feeStats[0] || { totalBilled: 0, totalCollected: 0, outstanding: 0, paidCount: 0, unpaidCount: 0 },
        salaries: salaryStats[0] || { totalDisbursed: 0 },
      };
    })
  );
};

export const getGrowthTrends = async (monthsParam) => {
  const months = Math.min(parseInt(monthsParam) || 6, 24);
  const since = new Date();
  since.setMonth(since.getMonth() - (months - 1));
  since.setDate(1);
  since.setHours(0, 0, 0, 0);

  const [institutes, admins, students, lecturers] = await Promise.all([
    repo.aggregateGrowthByMonth(Institute, {}, since),
    repo.aggregateGrowthByMonth(User, { role: 'admin' }, since),
    repo.aggregateGrowthByMonth(User, { role: 'student' }, since),
    repo.aggregateGrowthByMonth(User, { role: 'lecturer' }, since),
  ]);

  return { institutes, admins, students, lecturers };
};

export const getFeeRevenueReport = async () => {
  const [summary, byStatus, topInstitutes] = await repo.aggregateFeeRevenue();
  return { summary: summary[0] || {}, byStatus, topInstitutes };
};

export const getSalaryExpenditureReport = async () => {
  const salaryRepo = await import('../repositories/salary.repository.js');
  const [summary, byStatus, byInstitute] = await Promise.all([
    salaryRepo.aggregateSalaryExpenditure(),
    salaryRepo.aggregateSalaryByStatus(),
    salaryRepo.aggregateSalaryByInstitute(),
  ]);
  return { summary: summary[0] || {}, byStatus, byInstitute };
};

export const getInstituteDeepReport = async (instituteId) => {
  if (!mongoose.Types.ObjectId.isValid(instituteId)) throw new AppError('Invalid institute ID', 400);

  const institute = await repo.findInstituteById(instituteId);
  if (!institute) throw new AppError('Institute not found', 404);

  const [userStats, classCount, subjectCount, assignmentCount, resultCount, feeStats, salaryStats, attendanceDays] =
    await repo.getInstituteDeepData(instituteId);

  return {
    institute: { id: institute._id, name: institute.name, email: institute.email, createdAt: institute.createdAt },
    users: userStats,
    academics: { classes: classCount, subjects: subjectCount, assignments: assignmentCount, results: resultCount, attendanceRecords: attendanceDays },
    fees: feeStats[0] || { totalBilled: 0, totalCollected: 0, outstanding: 0, paidCount: 0, partialCount: 0, unpaidCount: 0 },
    salaries: salaryStats[0] || { totalDisbursed: 0, totalPaid: 0, totalPending: 0 },
  };
};

export const setAdminUnderReview = async (adminId, note, req) => {
  const admin = await User.findOne({ _id: adminId, role: 'admin', 'onboarding.status': 'pending' });
  if (!admin) throw new AppError('Admin not found or not in pending status', 404);

  admin.onboarding.status = 'under_review';
  admin.onboarding.reviewNote = note || '';
  admin.onboarding.transitions.push({
    from: 'pending', to: 'under_review', changedBy: req.user._id, changedAt: new Date(), note: note || '',
  });
  await admin.save();

  logAudit(req, {
    action: 'SET_ADMIN_UNDER_REVIEW', entity: 'User', entityId: admin._id,
    description: `Set admin ${admin.fullName} (${admin.email}) under review`,
    before: { onboardingStatus: 'pending' },
    after:  { onboardingStatus: 'under_review', reviewNote: note || '' },
    statusCode: 200,
  });
  return admin;
};

export const approveAdminOnboarding = async (adminId, note, req) => {
  const admin = await User.findOne({ _id: adminId, role: 'admin' });
  if (!admin) throw new AppError('Admin not found', 404);

  const from = admin.onboarding.status;
  admin.onboarding.status = 'approved';
  admin.approved = true;
  admin.onboarding.transitions.push({ from, to: 'approved', changedBy: req.user._id, changedAt: new Date(), note: note || '' });
  await admin.save();

  logAudit(req, {
    action: 'APPROVE_ADMIN', entity: 'User', entityId: admin._id,
    description: `Approved admin onboarding for ${admin.fullName} (${admin.email})`,
    before: { onboardingStatus: from, approved: false },
    after:  { onboardingStatus: 'approved', approved: true },
    statusCode: 200,
  });

  notify({ recipientId: admin._id, type: 'admin_approved', title: 'Account Approved', message: 'Your admin account has been approved. You can now log in.' });

  return admin;
};

export const rejectAdminOnboarding = async (adminId, rejectionReason, req) => {
  if (!rejectionReason) throw new AppError('Rejection reason is required', 400);

  const admin = await User.findOne({ _id: adminId, role: 'admin' });
  if (!admin) throw new AppError('Admin not found', 404);

  const from = admin.onboarding.status;
  admin.onboarding.status = 'rejected';
  admin.onboarding.rejectionReason = rejectionReason;
  admin.approved = false;
  admin.isActive = false;
  admin.onboarding.transitions.push({ from, to: 'rejected', changedBy: req.user._id, changedAt: new Date(), note: rejectionReason });
  await admin.save();

  logAudit(req, {
    action: 'REJECT_ADMIN', entity: 'User', entityId: admin._id,
    description: `Rejected admin onboarding for ${admin.fullName} (${admin.email}): ${rejectionReason}`,
    before: { onboardingStatus: from, approved: true, isActive: true },
    after:  { onboardingStatus: 'rejected', approved: false, isActive: false, rejectionReason },
    statusCode: 200,
  });

  notify({ recipientId: admin._id, type: 'admin_rejected', title: 'Account Rejected', message: `Your admin account request was rejected. Reason: ${rejectionReason}` });

  return admin;
};

export const getAdminOnboardingList = async ({ status, page = 1, limit = 20 }) => {
  const pageNum = parseInt(page) || 1;
  const lim = Math.min(parseInt(limit) || 20, 100);
  const skip = (pageNum - 1) * lim;

  const filter = { role: 'admin' };
  if (status) filter['onboarding.status'] = status;

  const [data, total] = await Promise.all([
    repo.findAdminsPaginated(filter, skip, lim),
    repo.countUsers(filter),
  ]);

  return { data, pagination: { page: pageNum, limit: lim, total, pages: Math.ceil(total / lim) } };
};

export const getAdminOnboardingDetail = async (adminId) => {
  const admin = await repo.findAdminOnboarding(adminId);
  if (!admin) throw new AppError('Admin not found', 404);
  return admin;
};

export const getInstituteById = async (id) => {
  const institute = await repo.findInstituteById(id);
  if (!institute) throw new AppError('Institute not found', 404);
  return institute;
};

export const getOnlineReports = async ({ page = 1, limit = 10 } = {}) => {
  const pageNum = Math.max(1, parseInt(page) || 1);
  const lim = Math.min(parseInt(limit) || 10, 50);
  const skip = (pageNum - 1) * lim;

  const [data, total] = await Promise.all([
    OnlineUserReport.find({})
      .sort({ weekStart: -1 })
      .skip(skip)
      .limit(lim)
      .select('-days._runningSum')
      .lean(),
    OnlineUserReport.countDocuments(),
  ]);

  return {
    data,
    pagination: { page: pageNum, limit: lim, total, pages: Math.ceil(total / lim) },
  };
};

export const getOnlineReport = async (reportId) => {
  if (!mongoose.Types.ObjectId.isValid(reportId))
    throw new AppError('Invalid report ID', 400);

  const report = await OnlineUserReport.findById(reportId)
    .select('-days._runningSum')
    .lean();

  if (!report) throw new AppError('Report not found', 404);
  return report;
};
