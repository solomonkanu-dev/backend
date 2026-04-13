import { v4 as uuidv4 } from 'uuid';
import * as repo from '../repositories/qrAttendance.repository.js';
import { AppError } from '../errors/AppError.js';

function todayDateOnly() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export const scanQR = async ({ qrToken, classId }, user) => {
  if (!['lecturer', 'admin'].includes(user.role)) {
    throw new AppError('Only lecturers and admins can scan QR codes', 403);
  }
  if (!qrToken || !classId) throw new AppError('qrToken and classId are required', 400);

  const student = await repo.findStudentByToken(qrToken, user.institute);
  if (!student) throw new AppError('Student not found — invalid QR code', 404);

  if (!student.qrActive) {
    const err = new AppError('QR code is deactivated for this student — contact admin', 403);
    err.student = { _id: student._id, fullName: student.fullName };
    throw err;
  }

  if (String(student.class) !== String(classId)) {
    const err = new AppError(`${student.fullName} is not enrolled in this class`, 400);
    err.student = { _id: student._id, fullName: student.fullName };
    throw err;
  }

  const today = todayDateOnly();
  const instituteId = user.institute?._id || user.institute;

  const { alreadyPresent } = await repo.markStudentPresentAtomic(
    classId, instituteId, today, student._id, user._id
  );

  return {
    message: alreadyPresent ? `${student.fullName} is already marked present` : `Marked present: ${student.fullName}`,
    student: { _id: student._id, fullName: student.fullName },
    alreadyPresent,
  };
};

export const finalizeQRAttendance = async ({ classId, date }, user) => {
  if (!['lecturer', 'admin'].includes(user.role)) throw new AppError('Access denied', 403);
  if (!classId) throw new AppError('classId is required', 400);

  const targetDate = date ? new Date(date) : todayDateOnly();
  targetDate.setHours(0, 0, 0, 0);

  const instituteId = user.institute?._id || user.institute;
  const classDoc = await repo.findClassById(classId, instituteId);
  if (!classDoc) throw new AppError('Class not found', 404);

  const allStudentIds = classDoc.students.map((s) => String(s));

  let attendance = await repo.findTodayAttendance(classId, instituteId, targetDate);

  if (!attendance) {
    attendance = await repo.createAttendance({
      class: classId,
      institute: instituteId,
      date: targetDate,
      type: 'student',
      subject: null,
      markedBy: user._id,
      records: allStudentIds.map((id) => ({ student: id, status: 'absent' })),
    });
    return { message: 'Attendance finalized — all students marked absent', absent: allStudentIds.length, present: 0 };
  }

  const scannedIds = new Set(attendance.records.map((r) => String(r.student)));
  let absentAdded = 0;
  for (const studentId of allStudentIds) {
    if (!scannedIds.has(studentId)) {
      attendance.records.push({ student: studentId, status: 'absent' });
      absentAdded++;
    }
  }

  if (absentAdded > 0) await attendance.save();

  const presentCount = attendance.records.filter((r) => r.status === 'present').length;
  return { message: 'Attendance finalized', present: presentCount, absent: attendance.records.length - presentCount };
};

export const getQRSession = async (classId, user) => {
  const instituteId = user.institute?._id || user.institute;
  const today = todayDateOnly();

  const classDoc = await repo.findClassWithStudents(classId, instituteId);
  if (!classDoc) throw new AppError('Class not found', 404);

  const attendance = await repo.findTodayAttendance(classId, instituteId, today);

  const scannedMap = {};
  if (attendance) {
    for (const r of attendance.records) {
      scannedMap[String(r.student)] = r.status;
    }
  }

  const students = classDoc.students.map((s) => ({
    _id: s._id,
    fullName: s.fullName,
    registrationNumber: s.studentProfile?.registrationNumber,
    status: scannedMap[String(s._id)] || null,
  }));

  return {
    class: { _id: classDoc._id, name: classDoc.name },
    date: today,
    finalized: attendance ? classDoc.students.every((s) => scannedMap[String(s._id)]) : false,
    students,
  };
};

export const getStudentQR = async (studentId, user) => {
  const instituteId = user.institute?._id || user.institute;
  const student = await repo.findStudentById(studentId, instituteId);
  if (!student) throw new AppError('Student not found', 404);

  if (!student.qrToken) {
    const token = uuidv4();
    await repo.updateStudentQR(studentId, { qrToken: token }, { new: true });
    student.qrToken = token;
  }

  return {
    _id: student._id,
    fullName: student.fullName,
    registrationNumber: student.studentProfile?.registrationNumber,
    qrToken: student.qrToken,
    qrActive: student.qrActive,
  };
};

export const toggleStudentQR = async (studentId, { qrActive }, user) => {
  if (typeof qrActive !== 'boolean') throw new AppError('qrActive (boolean) is required', 400);

  const instituteId = user.institute?._id || user.institute;
  const student = await repo.updateStudentQR(
    studentId,
    { qrActive },
    { filter: { _id: studentId, role: 'student', institute: instituteId }, new: true }
  );

  if (!student) throw new AppError('Student not found', 404);
  return { message: `QR code ${qrActive ? 'activated' : 'deactivated'} for ${student.fullName}`, student };
};

export const backfillQRTokens = async () => {
  const students = await repo.findStudentsWithoutToken();
  if (!students.length) return;

  const bulkOps = students.map((s) => ({
    updateOne: {
      filter: { _id: s._id },
      update: { $set: { qrToken: uuidv4() } },
    },
  }));

  await repo.bulkWriteUsers(bulkOps);
  console.log(`[QR] Backfilled tokens for ${students.length} students`);
};
