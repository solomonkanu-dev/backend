import mongoose from 'mongoose';
import * as repo from '../repositories/attendance.repository.js';
import Class from '../models/Class.js';
import User from '../models/user.js';
import Institute from '../models/Institute.js';
import { AppError } from '../errors/AppError.js';
import { sendEmailNotification } from '../utils/email.js';
import { sendSmsNotification } from '../utils/sms.js';
import { notify } from '../utils/notify.js';

export const getStudentsForAttendance = async (classId, user) => {
  if (!classId) throw new AppError('classId is required', 400);

  const classDoc = await Class.findOne({ _id: classId, institute: user.institute })
    .populate('students', 'fullName email studentProfile')
    .lean();

  if (!classDoc) throw new AppError('Class not found', 404);

  return { class: { _id: classDoc._id, name: classDoc.name }, students: classDoc.students };
};

export const markAttendance = async ({ classId, date, records }, user) => {
  if (user.role !== 'lecturer' && user.role !== 'admin') {
    throw new AppError('Only admins and lecturers can mark attendance', 403);
  }

  const attendanceDate = new Date(date);

  const existing = await repo.findOne({
    class: classId,
    subject: null,
    date: attendanceDate,
    institute: user.institute,
  });

  if (existing) throw new AppError('Attendance already marked for this class on this date', 409);

  const attendanceDoc = await repo.createAttendance({
    class: classId,
    institute: user.institute,
    date: attendanceDate,
    records: records.map((r) => ({ student: r.studentId, status: r.status })),
    markedBy: user._id,
  });

  checkAndSendAttendanceAlerts(attendanceDoc, user).catch(() => {});

  return attendanceDoc;
};

async function checkAndSendAttendanceAlerts(attendanceDoc, requestingUser) {
  try {
    const instituteId = requestingUser.institute?._id || requestingUser.institute;
    if (!instituteId) return;

    const absentStudentIds = attendanceDoc.records
      .filter((r) => r.status === 'absent')
      .map((r) => r.student);

    if (!absentStudentIds.length) return;

    const institute = await Institute.findById(instituteId).select('name').lean();
    const instituteName = institute?.name ?? 'Institution';
    const classId = attendanceDoc.class;

    // Resolve class name once for all notifications
    const classDoc = await Class.findById(classId).select('name').lean();
    const className = classDoc?.name ?? null;

    await Promise.allSettled(
      absentStudentIds.map(async (studentId) => {
        try {
          const student = await User.findById(studentId)
            .select('fullName email studentProfile')
            .lean();
          if (!student) return;

          // ── 1. Notify parents (every absence) ───────────────────────────────
          const parents = await User.find({
            linkedStudents: studentId,
            role: 'parent',
            isActive: true,
          }).select('_id fullName phoneNumber email').lean();

          const absenceData = {
            studentName: student.fullName,
            date: attendanceDoc.date,
            className,
          };
          const absenceMeta = {
            instituteId,
            type: 'absenceAlert',
            instituteName,
            data: absenceData,
          };

          const parentNotifMessage = `${student.fullName} was marked absent${className ? ` from ${className}` : ''} on ${new Date(attendanceDoc.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}.`;

          await Promise.allSettled(
            parents.map(async (parent) => {
              // In-app notification
              notify({
                recipientId: String(parent._id),
                instituteId: String(instituteId),
                type: 'absenceAlert',
                title: `Absence Alert — ${student.fullName}`,
                message: parentNotifMessage,
                relatedEntity: { studentId: String(studentId), date: attendanceDoc.date },
              }).catch(() => {});

              // SMS to parent's phone number
              if (parent.phoneNumber) {
                sendSmsNotification({ ...absenceMeta, recipientId: String(parent._id), recipientPhone: parent.phoneNumber }).catch(() => {});
              }
            })
          );

          // Also SMS the student's guardian phone (from studentProfile)
          const guardianPhone = student.studentProfile?.guardian?.guardianPhone;
          if (guardianPhone) {
            sendSmsNotification({ ...absenceMeta, recipientId: String(studentId), recipientPhone: guardianPhone }).catch(() => {});
          }

          // ── 2. Low-attendance alert to student (< 75%, existing logic) ──────
          const stats = await repo.aggregateStudentStats(classId, studentId);
          if (!stats.length || stats[0].total === 0) return;

          const { total, present } = stats[0];
          const rate = Number(((present / total) * 100).toFixed(1));
          if (rate >= 75) return;

          const notifData = { studentName: student.fullName, rate, totalClasses: total };
          const notifMeta = { instituteId, type: 'attendanceAlert', recipientId: studentId, instituteName, data: notifData };

          await sendEmailNotification({ ...notifMeta, recipientEmail: student.email });
          sendSmsNotification({ ...notifMeta, recipientPhone: student.studentProfile?.mobileNumber }).catch(() => {});
        } catch { /* per-student failure swallowed */ }
      })
    );
  } catch { /* fire-and-forget */ }
}

export const getMyAttendance = async (user) => {
  if (user.role !== 'student') throw new AppError('Access denied', 403);

  const attendances = await repo.findByStudentRecords({
    'records.student': user._id,
    ...(user.class ? { class: user.class } : {}),
  });

  return attendances.map((a) => {
    const rec = (a.records || []).find((r) => String(r.student) === String(user._id));
    return {
      _id: a._id,
      class: a.class,
      subject: a.subject,
      date: a.date,
      status: rec ? rec.status : null,
    };
  });
};

export const attendanceSummary = async (studentId) => {
  const [total, present, absent] = await Promise.all([
    repo.countByStudent(studentId),
    repo.countByStudentAndStatus(studentId, 'present'),
    repo.countByStudentAndStatus(studentId, 'absent'),
  ]);
  const percentage = total === 0 ? 0 : ((present / total) * 100).toFixed(2);
  return { total, present, absent, percentage };
};

export const getSubjectAttendance = async ({ classId, date }, user) => {
  if (!classId) throw new AppError('classId is required', 400);
  const query = {
    class: classId,
    institute: user.institute,
    ...(date && { date: new Date(date) }),
  };
  return repo.findByQuery(query);
};

export const getMyAttendanceSummary = async (user) => {
  if (user.role !== 'student') throw new AppError('Access denied', 403);
  const classFilter = user.class ? { class: new mongoose.Types.ObjectId(user.class) } : {};
  return repo.aggregateStudentSummary(user._id, classFilter);
};

export const checkExamEligibility = async (classId, user) => {
  if (user.role !== 'student') throw new AppError('Access denied', 403);
  if (!classId) throw new AppError('classId is required', 400);

  const stats = await repo.aggregateExamEligibility(user._id, classId);
  if (!stats.length) return { eligible: false, percentage: 0 };

  const percentage = (stats[0].present / stats[0].total) * 100;
  return { percentage: Number(percentage.toFixed(2)), eligible: percentage >= 75 };
};

export const attendanceAnalytics = async (classId, user) => {
  const match = {
    class: new mongoose.Types.ObjectId(classId),
    institute: new mongoose.Types.ObjectId(user.institute?._id || user.institute),
  };
  return repo.aggregateSummaryByClass(classId, user.institute?._id || user.institute);
};

export const getClassWiseReport = async ({ classId, from, to }, user) => {
  if (!classId) throw new AppError('classId is required', 400);

  const classDoc = await Class.findOne({ _id: classId, institute: user.institute });
  if (!classDoc) throw new AppError('Class not found', 404);

  if (user.role === 'lecturer' && String(classDoc.lecturer) !== String(user._id)) {
    throw new AppError('Access denied', 403);
  }

  const match = {
    class: new mongoose.Types.ObjectId(classId),
    institute: new mongoose.Types.ObjectId(user.institute?._id || user.institute),
  };

  if (from || to) {
    match.date = {};
    if (from) match.date.$gte = new Date(from);
    if (to) match.date.$lte = new Date(to);
  }

  const report = await repo.aggregateClassWiseReport(match);
  return { class: { _id: classDoc._id, name: classDoc.name }, report };
};

export const markEmployeeAttendance = async ({ date, records }, user) => {
  if (!['admin', 'super_admin'].includes(user.role)) throw new AppError('Access denied', 403);
  if (!date || !records?.length) throw new AppError('Date and attendance records are required', 400);

  const instituteId = user.institute?._id || user.institute;
  const adminId = user._id;

  const attendanceDocs = records.map((rec) => {
    if (!rec.lecturerId || !rec.status) throw new Error('Invalid lecturer attendance data');
    return {
      institute: instituteId,
      lecturer: rec.lecturerId,
      markedBy: adminId,
      date: new Date(date),
      status: rec.status,
    };
  });

  try {
    await repo.insertManyAttendance(attendanceDocs, { ordered: false });
  } catch (err) {
    if (err.code === 11000) throw new AppError('Attendance already marked for one or more lecturers on this date', 409);
    throw err;
  }
};

export const getEmployeeAttendance = async ({ employeeId, from, to }, user) => {
  if (!employeeId) throw new AppError('employeeId is required', 400);

  const match = {
    employee: mongoose.Types.ObjectId(employeeId),
    institute: mongoose.Types.ObjectId(user.institute),
    type: 'employee',
  };

  if (from || to) {
    match.date = {};
    if (from) match.date.$gte = new Date(from);
    if (to) match.date.$lte = new Date(to);
  }

  const attendances = await repo.findEmployeeAttendance(match);
  return { employee: { _id: employeeId }, count: attendances.length, attendances };
};

export const getEmployeeAttendanceSummary = async (employeeId, user) => {
  const summary = await repo.aggregateEmployeeSummary(employeeId, user.institute);

  if (!summary.length) {
    return { employee: { _id: employeeId }, totalDays: 0, present: 0, absent: 0, leave: 0, percentage: 0 };
  }

  return summary[0];
};
