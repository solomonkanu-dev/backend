import * as repo from '../repositories/lecturer.repository.js';
import { AppError } from '../errors/AppError.js';
import { logAudit } from '../utils/audit.js';
import { notify } from '../utils/notify.js';

export const getLecturerDashboard = () => ({ message: 'Lecturer dashboard not yet implemented' });

export const getLecturers = () => repo.findAll();

export const getLecturerById = async (id, user) => {
  if (!id) throw new AppError('Lecturer ID is required', 400);
  const lecturer = await repo.findById(id, user.institute);
  if (!lecturer) throw new AppError('Lecturer not found', 404);
  return lecturer;
};

export const getMyClasses = (user) => {
  const instituteId = user.institute?._id || user.institute;
  return repo.findMyClasses(user._id, instituteId);
};

export const getLecturerPromotionEligibility = async (classId, query, user) => {
  const instituteId = user.institute?._id || user.institute;
  const gradeThreshold = Number(query.gradeThreshold ?? 50);
  const attendanceThreshold = Number(query.attendanceThreshold ?? 75);

  const classDoc = await repo.findClassByLecturer(classId, instituteId, user._id);
  if (!classDoc) throw new AppError('You are not assigned to this class', 403);

  const students = await repo.findStudentsByClass(classId, instituteId);
  if (students.length === 0) return [];

  const studentIds = students.map((s) => s._id);

  const [results, fees, attendanceRecords] = await Promise.all([
    repo.findResultsByClass(classId, studentIds),
    repo.findFeesByClass(classId, studentIds, instituteId),
    repo.findAttendanceByClass(classId, instituteId),
  ]);

  const gradesByStudent = {};
  for (const r of results) {
    const sid = String(r.student);
    if (!gradesByStudent[sid]) gradesByStudent[sid] = { marks: 0, total: 0, count: 0 };
    gradesByStudent[sid].marks += r.marksObtained ?? 0;
    gradesByStudent[sid].total += r.totalScore ?? 100;
    gradesByStudent[sid].count += 1;
  }

  const feesByStudent = {};
  for (const f of fees) {
    const sid = String(f.student);
    feesByStudent[sid] = (feesByStudent[sid] ?? 0) + (f.balance ?? 0);
  }

  const attByStudent = {};
  for (const record of attendanceRecords) {
    for (const entry of record.records) {
      const sid = String(entry.student);
      if (!attByStudent[sid]) attByStudent[sid] = { present: 0, total: 0 };
      attByStudent[sid].total += 1;
      if (entry.status === 'present') attByStudent[sid].present += 1;
    }
  }

  return students.map((student) => {
    const sid = String(student._id);
    const gradeData = gradesByStudent[sid];
    const avgPct = gradeData && gradeData.total > 0 ? Math.round((gradeData.marks / gradeData.total) * 100) : null;
    const gradeFlagged = !gradeData || gradeData.count === 0 || avgPct < gradeThreshold;
    const feeBalance = feesByStudent[sid] ?? 0;
    const feeFlagged = feeBalance > 0;
    const attData = attByStudent[sid];
    const attRate = attData && attData.total > 0 ? Math.round((attData.present / attData.total) * 100) : null;
    const attFlagged = attData ? attRate < attendanceThreshold : false;

    return {
      _id: student._id,
      fullName: student.fullName,
      email: student.email,
      lifecycleStatus: student.lifecycleStatus,
      flags: {
        grades: { flagged: gradeFlagged, average: avgPct, threshold: gradeThreshold, subjectCount: gradeData?.count ?? 0 },
        fees: { flagged: feeFlagged, balance: feeBalance },
        attendance: { flagged: attFlagged, rate: attRate, threshold: attendanceThreshold },
      },
      clearForPromotion: !gradeFlagged && !feeFlagged && !attFlagged,
    };
  });
};

export const lecturerBulkPromote = async ({ sourceClassId, targetClassId, studentIds }, req) => {
  const user = req.user;
  const instituteId = user.institute?._id || user.institute;

  if (!sourceClassId || !targetClassId || !Array.isArray(studentIds) || studentIds.length === 0) {
    throw new AppError('sourceClassId, targetClassId, and a non-empty studentIds array are required', 400);
  }

  if (String(sourceClassId) === String(targetClassId)) {
    throw new AppError('Source and target class must be different', 400);
  }

  const sourceClass = await repo.findClassByLecturer(sourceClassId, instituteId, user._id);
  if (!sourceClass) throw new AppError('You are not assigned to the source class', 403);

  const targetClass = await repo.findClassByInstitute(targetClassId, instituteId);
  if (!targetClass) throw new AppError('Target class not found', 404);

  const students = await repo.findStudentsByClass(sourceClassId, instituteId);
  const validStudents = students.filter((s) => studentIds.map(String).includes(String(s._id)));

  if (validStudents.length !== studentIds.length) {
    throw new AppError(`Only ${validStudents.length} of ${studentIds.length} students are valid members of the source class`, 400);
  }

  const promotedIds = validStudents.map((s) => s._id);

  await repo.updateManyStudents(
    { _id: { $in: promotedIds } },
    {
      $set: { class: targetClassId },
      $push: { promotionHistory: { fromClass: sourceClassId, toClass: targetClassId, promotedAt: new Date() } },
    }
  );

  await repo.updateOneClass({ _id: sourceClassId }, { $pullAll: { students: promotedIds } });
  await repo.updateOneClass({ _id: targetClassId }, { $addToSet: { students: { $each: promotedIds } } });

  logAudit(req, {
    action: 'BULK_PROMOTE_STUDENTS',
    entity: 'Class',
    entityId: targetClassId,
    description: `Lecturer promoted ${promotedIds.length} students from "${sourceClass.name}" to "${targetClass.name}"`,
    statusCode: 200,
  });

  for (const student of validStudents) {
    notify({
      recipientId: student._id,
      instituteId,
      type: 'promotion',
      title: 'Class Promotion',
      message: `Congratulations! You have been promoted to ${targetClass.name}.`,
      relatedEntity: { entityType: 'Class', entityId: targetClassId },
    });
  }

  return { success: true, promoted: promotedIds.length, sourceClass: sourceClass.name, targetClass: targetClass.name };
};
