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
        institute: {
          id: institute._id,
          name: institute.name,
          email: institute.email,
          status: institute.status || 'active',
        },
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

  notify({
    recipientId: admin._id,
    type: 'admin_under_review',
    title: 'Account under review',
    message: note
      ? `Your account is being reviewed. ${note}`
      : 'Your admin account is being reviewed. You will be notified once a decision is made.',
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

// ─── Subscription / revenue report ────────────────────────────────────────────
// See docs/api-spec-super-admin-subscriptions.md in the frontend repo.
// Plan.price is the ANNUAL price (NLe); MRR = price / 12. Only active,
// non-expired subscriptions contribute to MRR/ARR.
export const getSubscriptionReport = async ({ expiringDays } = {}) => {
  const parsedDays = parseInt(expiringDays, 10);
  const days = Math.max(0, Number.isNaN(parsedDays) ? 30 : parsedDays);
  const institutes = await repo.findInstitutesWithPlan();

  const now = Date.now();
  const horizon = now + days * 86_400_000;
  const round2 = (n) => Math.round(n * 100) / 100;

  let mrr = 0;
  let arr = 0;
  let active = 0;
  let paid = 0;
  let free = 0;
  let expiringSoon = 0;
  let expiredCount = 0;
  let unassigned = 0;

  const planMap = new Map();
  const expiring = [];
  const expired = [];

  for (const inst of institutes) {
    const plan = inst.plan; // populated subdoc, or null
    if (!plan) {
      unassigned += 1;
      continue;
    }

    const expiryTs = inst.planExpiry ? new Date(inst.planExpiry).getTime() : null;
    const planName = plan.displayName || plan.name;

    if (expiryTs !== null && expiryTs < now) {
      expiredCount += 1;
      expired.push({
        instituteId: inst._id,
        instituteName: inst.name,
        planName,
        planExpiry: new Date(expiryTs).toISOString(),
        daysSinceExpiry: Math.floor((now - expiryTs) / 86_400_000),
      });
      continue;
    }

    // Active (non-expired) subscription
    active += 1;
    const price = plan.price || 0;
    if (price > 0) paid += 1;
    else free += 1;

    const planMrr = price / 12;
    mrr += planMrr;
    arr += price;

    const key = String(plan._id);
    const entry =
      planMap.get(key) ||
      {
        planId: key,
        name: plan.name,
        displayName: plan.displayName ?? null,
        price,
        instituteCount: 0,
        mrr: 0,
      };
    entry.instituteCount += 1;
    entry.mrr += planMrr;
    planMap.set(key, entry);

    if (expiryTs !== null && expiryTs <= horizon) {
      expiringSoon += 1;
      expiring.push({
        instituteId: inst._id,
        instituteName: inst.name,
        planName,
        planExpiry: new Date(expiryTs).toISOString(),
        daysUntilExpiry: Math.floor((expiryTs - now) / 86_400_000),
      });
    }
  }

  expiring.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
  expired.sort((a, b) => a.daysSinceExpiry - b.daysSinceExpiry);

  const byPlan = [...planMap.values()]
    .map((p) => ({ ...p, mrr: round2(p.mrr) }))
    .sort((a, b) => b.mrr - a.mrr);

  return {
    summary: {
      mrr: round2(mrr),
      arr: round2(arr),
      activeSubscriptions: active,
      paidSubscriptions: paid,
      freeSubscriptions: free,
      expiringSoon,
      expired: expiredCount,
      unassigned,
    },
    byPlan,
    expiring,
    expired,
  };
};

// ─── Academic oversight report ────────────────────────────────────────────────
// See docs/api-spec-super-admin-academics.md in the frontend repo.
export const getAcademicReport = async (monthsParam) => {
  const parsedMonths = parseInt(monthsParam, 10);
  const months = Math.min(Math.max(Number.isNaN(parsedMonths) ? 6 : parsedMonths, 1), 24);
  const since = new Date();
  since.setMonth(since.getMonth() - (months - 1));
  since.setDate(1);
  since.setHours(0, 0, 0, 0);

  const [
    classes,
    subjects,
    assignments,
    resultsPublished,
    submissionStats,
    attRate,
    attTrend,
    gradeDist,
    attByInst,
    resByInst,
    subByInst,
    studentsByInst,
    classesByInst,
    institutes,
  ] = await Promise.all([
    repo.countClassesAll(),
    repo.countSubjectsAll(),
    repo.countAssignmentsSince(since),
    repo.countResultsPublishedSince(since),
    repo.aggregateSubmissionStats(since),
    repo.aggregateAttendanceRate(since),
    repo.aggregateAttendanceTrend(since),
    repo.aggregateGradeDistribution(since),
    repo.aggregateAttendanceByInstitute(since),
    repo.aggregateResultsByInstitute(since),
    repo.aggregateSubmissionsByInstitute(since),
    repo.countStudentsByInstitute(),
    repo.countClassesByInstitute(),
    repo.findAllInstitutesLean(),
  ]);

  // Integer percentage 0-100, or null when there is no underlying data.
  const rate = (num, den) => (den > 0 ? Math.round((num / den) * 100) : null);

  const graded = submissionStats.find((s) => s._id === 'graded')?.count ?? 0;
  const pending = submissionStats.find((s) => s._id === 'pending')?.count ?? 0;
  const totalSubmissions = graded + pending;

  const att = attRate[0] || { total: 0, present: 0 };

  const totalResults = resByInst.reduce((s, r) => s + r.total, 0);
  const totalFails = resByInst.reduce((s, r) => s + r.fails, 0);

  // Attendance trend — one entry per month in the window, nulls included.
  const trendMap = new Map(attTrend.map((t) => [`${t._id.year}-${t._id.month}`, t]));
  const attendanceTrend = [];
  const cursor = new Date(since);
  for (let i = 0; i < months; i += 1) {
    const year = cursor.getFullYear();
    const month = cursor.getMonth() + 1;
    const t = trendMap.get(`${year}-${month}`);
    attendanceTrend.push({ year, month, rate: t ? rate(t.present, t.total) : null });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  const gradeDistribution = gradeDist.map((g) => ({ grade: g._id, count: g.count }));

  // Per-institute lookup maps
  const attMap = new Map(attByInst.map((a) => [String(a._id), a]));
  const resMap = new Map(resByInst.map((r) => [String(r._id), r]));
  const studMap = new Map(studentsByInst.map((s) => [String(s._id), s.count]));
  const classMap = new Map(classesByInst.map((c) => [String(c._id), c.count]));
  const subMap = new Map();
  for (const row of subByInst) {
    const key = String(row._id.institute);
    const e = subMap.get(key) || { graded: 0, pending: 0 };
    e[row._id.status] = row.count;
    subMap.set(key, e);
  }

  const byInstitute = institutes.map((inst) => {
    const key = String(inst._id);
    const a = attMap.get(key);
    const r = resMap.get(key);
    const sub = subMap.get(key) || { graded: 0, pending: 0 };
    return {
      instituteId: inst._id,
      instituteName: inst.name,
      students: studMap.get(key) ?? 0,
      attendanceRate: a ? rate(a.present, a.total) : null,
      passRate: r ? rate(r.total - r.fails, r.total) : null,
      assignmentsGraded: sub.graded,
      assignmentsPending: sub.pending,
    };
  });

  const inactiveInstitutes = institutes
    .filter((inst) => (classMap.get(String(inst._id)) ?? 0) === 0)
    .map((inst) => ({
      instituteId: inst._id,
      instituteName: inst.name,
      reason: 'No classes created',
    }));

  return {
    summary: {
      classes,
      subjects,
      assignments,
      assignmentsGraded: graded,
      assignmentsPending: pending,
      submissionRate: rate(graded, totalSubmissions),
      attendanceRate: rate(att.present, att.total),
      resultsPublished,
      examsPassRate: rate(totalResults - totalFails, totalResults),
    },
    attendanceTrend,
    gradeDistribution,
    byInstitute,
    inactiveInstitutes,
  };
};

// ─── Institute lifecycle ──────────────────────────────────────────────────────
// Suspended/archived institutes have all their non-super-admin users blocked
// at login and on every authenticated request (see middlewares/auth.js).

const INSTITUTE_STATUS_META = {
  suspended: { action: 'SUSPEND_INSTITUTE', verb: 'Suspended' },
  archived: { action: 'ARCHIVE_INSTITUTE', verb: 'Archived' },
  active: { action: 'RESTORE_INSTITUTE', verb: 'Restored' },
};

const setInstituteStatus = async (instituteId, status, reason, req) => {
  if (!mongoose.Types.ObjectId.isValid(instituteId))
    throw new AppError('Invalid institute ID', 400);

  const institute = await repo.findInstituteById(instituteId);
  if (!institute) throw new AppError('Institute not found', 404);

  const current = institute.status || 'active';
  if (current === status) throw new AppError(`Institute is already ${status}`, 400);

  const meta = INSTITUTE_STATUS_META[status];
  institute.status = status;
  institute.statusReason = status === 'active' ? '' : reason || '';
  await institute.save();

  logAudit(req, {
    action: meta.action,
    entity: 'Institute',
    entityId: institute._id,
    description: `${meta.verb} institute ${institute.name}`,
    before: { status: current },
    after: { status },
    statusCode: 200,
  });

  return {
    id: institute._id,
    name: institute.name,
    status: institute.status,
    statusReason: institute.statusReason,
  };
};

export const suspendInstitute = (instituteId, reason, req) =>
  setInstituteStatus(instituteId, 'suspended', reason, req);

export const archiveInstitute = (instituteId, reason, req) =>
  setInstituteStatus(instituteId, 'archived', reason, req);

export const restoreInstitute = (instituteId, req) =>
  setInstituteStatus(instituteId, 'active', '', req);
