import mongoose from 'mongoose';
import * as repo from '../repositories/analytics.repository.js';

function parseRange(from, to) {
  const now = new Date();
  const end = to ? new Date(to) : now;
  const start = from ? new Date(from) : new Date(new Date(now).setMonth(now.getMonth() - 1));
  return { start, end };
}

function prevPeriod(start, end) {
  const ms = end - start;
  return { start: new Date(start - ms), end: new Date(start) };
}

function delta(current, previous) {
  if (!previous || previous === 0) return null;
  return parseFloat(((current - previous) / previous * 100).toFixed(1));
}

function instituteFilter(user, queryInstitution) {
  const isSuperAdmin = user.role === 'super_admin';
  if (isSuperAdmin && queryInstitution) return new mongoose.Types.ObjectId(queryInstitution);
  if (!isSuperAdmin) return user.institute?._id || user.institute;
  return null;
}

export const getAttendanceSummary = async (user, query) => {
  const instId = instituteFilter(user, query.institution);
  const { start, end } = parseRange(query.from, query.to);
  const { start: prevStart, end: prevEnd } = prevPeriod(start, end);

  const baseMatch = { type: 'student', date: { $gte: start, $lte: end } };
  if (instId) baseMatch.institute = instId;

  const prevMatch = { ...baseMatch, date: { $gte: prevStart, $lte: prevEnd } };

  const [current, previous, byClass] = await Promise.all([
    repo.aggregateAttendanceSummary(baseMatch),
    repo.aggregateAttendanceSummary(prevMatch),
    repo.aggregateAttendanceByClass(baseMatch),
  ]);

  const total = current[0]?.total ?? 0;
  const present = current[0]?.present ?? 0;
  const absent = current[0]?.absent ?? 0;
  const rate = total > 0 ? parseFloat(((present / total) * 100).toFixed(1)) : 0;
  const prevTotal = previous[0]?.total ?? 0;
  const prevPresent = previous[0]?.present ?? 0;
  const prevRate = prevTotal > 0 ? parseFloat(((prevPresent / prevTotal) * 100).toFixed(1)) : 0;

  return {
    period: { from: start, to: end },
    summary: { total, present, absent, attendanceRate: rate },
    delta: { attendanceRate: delta(rate, prevRate), present: delta(present, prevPresent) },
    byClass,
  };
};

export const getFeeDefaults = async (user, query) => {
  const instId = instituteFilter(user, query.institution);
  const { start, end } = parseRange(query.from, query.to);
  const { start: prevStart, end: prevEnd } = prevPeriod(start, end);

  const baseMatch = { createdAt: { $gte: start, $lte: end } };
  if (instId) baseMatch.institute = instId;
  const prevMatch = { ...baseMatch, createdAt: { $gte: prevStart, $lte: prevEnd } };

  const [current, previous] = await Promise.all([
    repo.aggregateFeeDefaults(baseMatch),
    repo.aggregateFeeDefaults(prevMatch),
  ]);

  const summarize = (rows) => {
    const out = { paid: 0, partial: 0, unpaid: 0, totalBilled: 0, totalOutstanding: 0, totalRecords: 0 };
    for (const r of rows) {
      out[r._id] = r.count;
      out.totalBilled += r.totalBilled;
      out.totalOutstanding += r.totalOutstanding;
      out.totalRecords += r.count;
    }
    out.defaultRate = out.totalRecords > 0
      ? parseFloat((((out.partial + out.unpaid) / out.totalRecords) * 100).toFixed(1))
      : 0;
    out.collectionRate = out.totalBilled > 0
      ? parseFloat((((out.totalBilled - out.totalOutstanding) / out.totalBilled) * 100).toFixed(1))
      : 0;
    return out;
  };

  const curr = summarize(current);
  const prev = summarize(previous);

  let byInstitute = [];
  if (!instId) {
    byInstitute = await repo.aggregateFeeDefaultsByInstitute(baseMatch);
  }

  return {
    period: { from: start, to: end },
    summary: curr,
    delta: {
      defaultRate: delta(curr.defaultRate, prev.defaultRate),
      collectionRate: delta(curr.collectionRate, prev.collectionRate),
      totalOutstanding: delta(curr.totalOutstanding, prev.totalOutstanding),
    },
    byStatus: current.map((r) => ({ status: r._id, count: r.count, outstanding: r.totalOutstanding })),
    ...(byInstitute.length > 0 && { topDefaultingInstitutes: byInstitute }),
  };
};

export const getAssignmentCompletion = async (user, query) => {
  const instId = instituteFilter(user, query.institution);
  const { start, end } = parseRange(query.from, query.to);
  const { start: prevStart, end: prevEnd } = prevPeriod(start, end);

  const assignMatch = { status: 'published', createdAt: { $gte: start, $lte: end } };
  if (instId) assignMatch.institute = instId;
  const prevAssignMatch = { ...assignMatch, createdAt: { $gte: prevStart, $lte: prevEnd } };

  const [assignments, prevAssignments] = await Promise.all([
    repo.findAssignments(assignMatch),
    repo.findAssignments(prevAssignMatch),
  ]);

  const assignmentIds = assignments.map((a) => a._id);
  const prevIds = prevAssignments.map((a) => a._id);

  const [submissions, prevSubmissions] = await Promise.all([
    repo.findSubmissions({ assignment: { $in: assignmentIds } }),
    repo.findSubmissions({ assignment: { $in: prevIds } }),
  ]);

  const totalAssignments = assignments.length;
  let totalPossibleSubmissions = 0;
  if (totalAssignments > 0) {
    const classIds = [...new Set(assignments.map((a) => String(a.class)).filter(Boolean))].map(
      (id) => new mongoose.Types.ObjectId(id)
    );
    const agg = await repo.aggregateClassStudentCount(classIds, instId);
    totalPossibleSubmissions = agg[0]?.total ?? 0;
  }

  const submitted = submissions.length;
  const lateSubmissions = submissions.filter((s) => s.isLate).length;
  const gradedSubmissions = submissions.filter((s) => s.status === 'graded').length;
  const prevTotal = prevAssignments.length;
  const prevSubmitted = prevSubmissions.length;

  const completionRate = totalPossibleSubmissions > 0
    ? parseFloat(((submitted / totalPossibleSubmissions) * 100).toFixed(1))
    : 0;
  const prevRate = prevTotal > 0 && prevSubmissions.length > 0
    ? parseFloat(((prevSubmitted / prevTotal) * 100).toFixed(1))
    : 0;

  const byClass = await repo.aggregateSubmissionsByClass(assignmentIds);

  return {
    period: { from: start, to: end },
    summary: {
      totalAssignments,
      totalSubmissions: submitted,
      lateSubmissions,
      gradedSubmissions,
      completionRate,
      onTimeRate: submitted > 0 ? parseFloat((((submitted - lateSubmissions) / submitted) * 100).toFixed(1)) : 0,
    },
    delta: {
      totalAssignments: delta(totalAssignments, prevTotal),
      completionRate: delta(completionRate, prevRate),
    },
    byClass,
  };
};

export const getEnrollmentTrends = async (user, query) => {
  const instId = instituteFilter(user, query.institution);
  const cohort = query.cohort;
  const { start, end } = parseRange(query.from, query.to);
  const { start: prevStart, end: prevEnd } = prevPeriod(start, end);

  const baseMatch = { role: 'student', createdAt: { $gte: start, $lte: end } };
  if (instId) baseMatch.institute = instId;
  if (cohort) baseMatch.class = new mongoose.Types.ObjectId(cohort);
  const prevMatch = { ...baseMatch, createdAt: { $gte: prevStart, $lte: prevEnd } };

  const [snapshot, prevSnapshot, monthly] = await Promise.all([
    repo.aggregateEnrollmentSnapshot(baseMatch),
    repo.aggregateEnrollmentSnapshot(prevMatch),
    repo.aggregateEnrollmentMonthly(baseMatch),
  ]);

  const curr = snapshot[0] ?? { total: 0, active: 0, approved: 0 };
  const prevTotal = prevSnapshot[0]?.total ?? 0;

  let byClass = [];
  let byInstitute = [];

  if (instId || cohort) {
    byClass = await repo.aggregateEnrollmentByClass(baseMatch);
  } else {
    byInstitute = await repo.aggregateEnrollmentByInstitute(baseMatch);
  }

  return {
    period: { from: start, to: end },
    summary: {
      totalEnrolled: curr.total,
      activeStudents: curr.active,
      approvedStudents: curr.approved,
      inactiveStudents: curr.total - curr.active,
    },
    delta: { totalEnrolled: delta(curr.total, prevTotal) },
    monthly,
    ...(byClass.length > 0 && { byClass }),
    ...(byInstitute.length > 0 && { byInstitute }),
  };
};
