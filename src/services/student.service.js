import * as repo from '../repositories/student.repository.js';
import User from '../models/user.js';
import { AppError } from '../errors/AppError.js';

export const getStudentDashboard = () => ({ message: 'User dashboard not yet implemented' });

export const getStudents = () => repo.findAll();

export const getStudentById = async (id) => {
  const student = await repo.findById(id);
  if (!student || student.role !== 'student') throw new AppError('User not found', 404);
  return student;
};

export const getMyFees = (user) => {
  const filter = { student: user._id, institute: user.institute };
  if (user.class) filter.class = user.class;
  return repo.findMyFees(filter);
};

export const getMyResults = (user, termId) => {
  const classId = user.class;
  const filter = { student: user._id, institute: user.institute };
  if (classId) filter.class = classId;
  if (termId) filter.term = termId;
  return repo.findMyResults(filter);
};

export const getMyResultsByClass = (classId, user, termId) => {
  const filter = { student: user._id, institute: user.institute };
  if (classId) filter.class = classId;
  if (termId) filter.term = termId;
  return repo.findMyResults(filter);
};

export const getMyPromotionHistory = async (userId) => {
  const student = await repo.findMyPromotionHistory(userId);
  const history = (student.promotionHistory ?? [])
    .slice()
    .reverse()
    .map((p) => ({ fromClass: p.fromClass, toClass: p.toClass, promotedAt: p.promotedAt }));
  return { currentClass: student.class, history };
};

export const getMyReportCard = async (user) => {
  const studentId = user._id;

  const [student, institute, terms, results, attendanceRecords] = await Promise.all([
    repo.findMyReportCardData(studentId),
    repo.findInstituteById(user.institute),
    repo.findTermsByInstitute(user.institute),
    repo.findResultsForReportCard(studentId, user.institute),
    repo.findAllAttendance(user.institute),
  ]);

  const totalClasses = attendanceRecords.length;
  const presentCount = attendanceRecords.reduce((acc, record) => {
    const entry = record.records?.find((r) => String(r.student) === String(studentId));
    return acc + (entry?.status === 'present' ? 1 : 0);
  }, 0);
  const attendance = { present: presentCount, total: totalClasses, percentage: totalClasses > 0 ? Math.round((presentCount / totalClasses) * 100) : 0 };

  // Position uses annual totals (all terms combined)
  const classmates = await repo.findClassResults(student.class?._id ?? student.class, user.institute);
  const classTotals = {};
  classmates.forEach((r) => { const sid = String(r.student); classTotals[sid] = (classTotals[sid] ?? 0) + (r.marksObtained ?? 0); });

  const myTotal = results.reduce((s, r) => s + (r.marksObtained ?? 0), 0);
  const outOf = Object.keys(classTotals).length;
  const higherCount = Object.values(classTotals).filter((t) => t > myTotal).length;
  const position = { rank: outOf > 0 ? higherCount + 1 : null, outOf };

  return {
    student,
    institute,
    terms: terms.map((t) => ({ _id: t._id, name: t.name, academicYear: t.academicYear })),
    results: results.map((r) => ({
      _id: r._id,
      subject: r.subject,
      term: r.term ? { _id: r.term._id, name: r.term.name, academicYear: r.term.academicYear } : null,
      marksObtained: r.marksObtained,
      totalScore: r.totalScore ?? 100,
      grade: r.grade,
    })),
    attendance,
    position,
    generatedAt: new Date(),
  };
};

export const getMyPayments = (user) => repo.findMyPayments(user._id, user.institute);

export const getMyPaymentReceipt = async (paymentId, user) => {
  const payment = await repo.findPaymentReceipt(paymentId, user._id, user.institute);
  if (!payment) throw new AppError('Receipt not found', 404);

  await User.populate(payment, { path: 'student.class', select: 'name' });

  const [institute, studentFee] = await Promise.all([
    repo.findInstituteById(user.institute),
    repo.findStudentFeeOne(user._id, user.institute),
  ]);

  return { payment, institute, studentFee };
};

export const getMyRanking = async (user, termId) => {
  const studentId = user._id;
  const studentDoc = await User.findById(studentId).select('class').lean();
  if (!studentDoc?.class) return { rank: null, outOf: 0, total: 0 };

  const results = await repo.findResultsForRanking(studentDoc.class, user.institute, termId);
  const totals = {};
  results.forEach((r) => { const sid = String(r.student); totals[sid] = (totals[sid] ?? 0) + (r.marksObtained ?? 0); });

  const myTotal = totals[String(studentId)] ?? 0;
  const outOf = Object.keys(totals).length;
  const higherCount = Object.entries(totals).filter(([sid, t]) => String(sid) !== String(studentId) && t > myTotal).length;

  return { rank: higherCount + 1, outOf, total: myTotal };
};
