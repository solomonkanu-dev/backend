import * as repo from '../repositories/parent.repository.js';
import { AppError } from '../errors/AppError.js';

export const getMyChildren = (linkedStudentIds) => repo.findLinkedStudents(linkedStudentIds);

export const getChildAttendance = async (studentId, classId, user) => {
  const linkedIds = user.linkedStudents.map(String);
  if (!linkedIds.includes(String(studentId))) {
    throw new AppError("Access denied to this student's data", 403);
  }

  let resolvedClassId = classId;
  if (!resolvedClassId) {
    const student = await repo.findStudentById(studentId);
    resolvedClassId = student?.class;
  }

  const instituteId = user.institute?._id || user.institute;
  const attendanceRecords = await repo.findAttendanceForStudent({
    institute: instituteId,
    ...(resolvedClassId ? { class: resolvedClassId } : {}),
    'records.student': studentId,
  });

  let total = 0, present = 0, absent = 0;
  const recentRecords = [];

  for (const record of attendanceRecords) {
    const entry = record.records.find((r) => String(r.student) === String(studentId));
    if (entry) {
      total += 1;
      if (entry.status === 'present') present += 1;
      else absent += 1;
      if (recentRecords.length < 10) recentRecords.push({ date: record.date, status: entry.status });
    }
  }

  const rate = total === 0 ? 0 : Math.round((present / total) * 100);
  return { total, present, absent, rate, recentRecords, classId: resolvedClassId ?? null };
};

export const getChildResults = async (studentId, classId, user) => {
  const linkedIds = user.linkedStudents.map(String);
  if (!linkedIds.includes(String(studentId))) {
    throw new AppError("Access denied to this student's data", 403);
  }

  let resolvedClassId = classId;
  if (!resolvedClassId) {
    const student = await repo.findStudentById(studentId);
    resolvedClassId = student?.class;
  }

  const filter = { student: studentId, isPublished: true };
  if (resolvedClassId) filter.class = resolvedClassId;

  const results = await repo.findResultsForStudent(filter);
  return { data: results, classId: resolvedClassId ?? null };
};

export const getChildAssignments = async (studentId, user) => {
  const linkedIds = user.linkedStudents.map(String);
  if (!linkedIds.includes(String(studentId))) {
    throw new AppError("Access denied to this student's data", 403);
  }

  const student = await repo.findStudentById(studentId);
  if (!student?.class) return { data: [], classId: null };

  const instituteId = user.institute?._id || user.institute;
  const assignments = await repo.findAssignmentsForClass(student.class, instituteId);
  return { data: assignments, classId: student.class };
};

export const getChildPromotionHistory = async (studentId, user) => {
  const linkedIds = user.linkedStudents.map(String);
  if (!linkedIds.includes(String(studentId))) {
    throw new AppError("Access denied to this student's data", 403);
  }

  const student = await repo.findStudentWithPromotion(studentId);
  if (!student) throw new AppError('Student not found', 404);

  const history = (student.promotionHistory ?? [])
    .slice()
    .reverse()
    .map((p) => ({ fromClass: p.fromClass, toClass: p.toClass, promotedAt: p.promotedAt }));

  return { currentClass: student.class, history };
};

export const getChildFees = async (studentId, user) => {
  const linkedIds = user.linkedStudents.map(String);
  if (!linkedIds.includes(String(studentId))) {
    throw new AppError("Access denied to this student's data", 403);
  }

  const instituteId = user.institute?._id || user.institute;
  const student = await repo.findStudentById(studentId);
  const feeFilter = { student: studentId, institute: instituteId };
  if (student?.class) feeFilter.class = student.class;

  const fees = await repo.findStudentFees(feeFilter);
  return fees.map((sf) => ({
    _id: sf._id,
    totalAmount: sf.totalAmount ?? 0,
    amountPaid: (sf.totalAmount ?? 0) - (sf.balance ?? 0),
    balance: sf.balance ?? 0,
    status: sf.status,
    dueDate: sf.dueDate,
    items: (sf.fees ?? []).map((item) => ({
      title: item.label ?? 'Fee',
      amount: item.amount ?? 0,
      paid: item.paid ?? 0,
    })),
  }));
};

export const getAnnouncements = (instituteId) => repo.findAnnouncements(instituteId);

export const getChildAttendanceStats = async (studentId, user) => {
  const linkedIds = user.linkedStudents.map(String);
  if (!linkedIds.includes(String(studentId))) {
    throw new AppError("Access denied to this student's data", 403);
  }

  const instituteId = user.institute?._id || user.institute;

  const [todayRecord, monthlyAbsences] = await Promise.all([
    repo.findTodayAttendanceForStudent(studentId, instituteId),
    repo.aggregateAbsencesByMonth(studentId),
  ]);

  // Build a 12-month array with absence counts
  const now = new Date();
  const months = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const found = monthlyAbsences.find(
      (m) => m._id.year === year && m._id.month === month
    );
    months.push({
      year,
      month,
      label: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      absences: found?.count ?? 0,
    });
  }

  return {
    todayStatus: todayRecord,
    monthlyAbsences: months,
    totalAbsencesThisYear: months.reduce((s, m) => s + m.absences, 0),
  };
};

export const getChildPayments = async (studentId, user) => {
  const linkedIds = user.linkedStudents.map(String);
  if (!linkedIds.includes(String(studentId))) {
    throw new AppError("Access denied to this student's data", 403);
  }

  const instituteId = user.institute?._id || user.institute;
  const { findPaymentsByStudent } = await import('../repositories/feePayment.repository.js');
  return findPaymentsByStudent(studentId, instituteId);
};

export const getChildPaymentReceipt = async (studentId, paymentId, user) => {
  const linkedIds = user.linkedStudents.map(String);
  if (!linkedIds.includes(String(studentId))) {
    throw new AppError("Access denied to this student's data", 403);
  }

  const instituteId = user.institute?._id || user.institute;
  const { findPaymentById } = await import('../repositories/feePayment.repository.js');
  const { default: Institute } = await import('../models/Institute.js');
  const { default: StudentFee } = await import('../models/StudentFee.js');

  const payment = await findPaymentById(paymentId, instituteId);
  if (!payment || String(payment.student?._id ?? payment.student) !== String(studentId)) {
    throw new AppError('Receipt not found', 404);
  }

  const [institute, studentFee] = await Promise.all([
    Institute.findById(instituteId).lean(),
    StudentFee.findOne({ student: studentId, institute: instituteId }).lean(),
  ]);

  return { payment, institute, studentFee };
};
