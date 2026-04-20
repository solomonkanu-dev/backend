import { AppError } from '../errors/AppError.js';
import { resolveGrade } from './grading.service.js';
import * as resultRepo from '../repositories/result.repository.js';
import User from '../models/user.js';
import Subject from '../models/Subject.js';
import AcademicTerm from '../models/AcademicTerm.js';
import Class from '../models/Class.js';
import Result from '../models/Result.js';
import { logAudit } from '../utils/audit.js';
import { sendEmailNotification } from '../utils/email.js';

const getInstituteId = (user) => user.institute?._id || user.institute;

export const assignMarks = async (body, req) => {
  const { user } = req;
  if (!['admin', 'lecturer'].includes(user.role)) {
    throw new AppError('Access denied', 403);
  }

  const { studentId, subjectId, classId, marksObtained, totalScore, termId } = body;
  const instituteId = user.institute?._id || user.institute;

  const student = await User.findOne({ _id: studentId, role: 'student', institute: instituteId });
  if (!student) throw new AppError('Student not found', 404);

  const subject = await Subject.findOne({ _id: subjectId, class: classId, institute: instituteId });
  if (!subject) throw new AppError('Subject not found', 404);

  if (user.role === 'lecturer' && !subject.lecturer.equals(user._id)) {
    throw new AppError('You are not assigned to this subject', 403);
  }

  const effectiveTotalScore = totalScore ?? subject.totalMarks ?? 100;

  if (marksObtained > effectiveTotalScore) {
    throw new AppError(`Marks (${marksObtained}) exceed total (${effectiveTotalScore})`, 400);
  }

  const percentage = effectiveTotalScore > 0
    ? Math.round((marksObtained / effectiveTotalScore) * 100)
    : marksObtained;

  const grade = await resolveGrade(instituteId, percentage);

  // Resolve term: use provided termId, fall back to current term
  let resolvedTermId = termId ?? null;
  if (!resolvedTermId) {
    const currentTerm = await AcademicTerm.findOne({ institute: instituteId, isCurrent: true }).lean();
    resolvedTermId = currentTerm?._id ?? null;
  }

  const existing = await Result.findOne({ student: studentId, subject: subjectId, class: classId, term: resolvedTermId }).lean();
  const beforeMarks = existing
    ? { marksObtained: existing.marksObtained, grade: existing.grade, totalScore: existing.totalScore }
    : null;

  const result = await resultRepo.findOneAndUpsert(
    { student: studentId, subject: subjectId, class: classId, term: resolvedTermId },
    { marksObtained, totalScore: effectiveTotalScore, grade, institute: instituteId }
  );

  logAudit(req, {
    action: 'ASSIGN_MARKS',
    entity: 'Result',
    entityId: result._id,
    description: `Assigned ${marksObtained}/${effectiveTotalScore} (${percentage}%, grade ${grade}) to student ${student.fullName} for subject ${subject.name}`,
    before: beforeMarks,
    after: { marksObtained, totalScore: effectiveTotalScore, percentage, grade },
    statusCode: 200,
  });

  // Fire-and-forget email notification
  const { default: Institute } = await import('../models/Institute.js');
  const institute = await Institute.findById(instituteId).select('name').lean();
  sendEmailNotification({
    instituteId,
    type: 'resultsPublished',
    recipientId: studentId,
    recipientEmail: student.email,
    instituteName: institute?.name ?? 'Institution',
    data: {
      studentName: student.fullName,
      subject: subject.name,
      marksObtained,
      totalMarks: effectiveTotalScore,
      grade: result.grade ?? 'N/A',
    },
  }).catch(() => {});

  return result;
};

export const publishResults = async (classId, termId, req) => {
  const instituteId = getInstituteId(req.user);
  const { matchedCount, modifiedCount } = await Result.updateMany(
    { class: classId, term: termId, institute: instituteId },
    { $set: { isPublished: true } }
  );
  const [cls, term] = await Promise.all([
    Class.findById(classId).select('name').lean(),
    AcademicTerm.findById(termId).select('name').lean(),
  ]);
  logAudit(req, {
    action: 'PUBLISH_RESULTS',
    entity: 'Result',
    description: `Published ${modifiedCount} of ${matchedCount} result(s) for class ${cls?.name ?? classId} term ${term?.name ?? termId}`,
    after: { isPublished: true, count: modifiedCount, matchedCount },
    statusCode: 200,
  });
  return { matched: matchedCount, modified: modifiedCount };
};

export const unpublishResults = async (classId, termId, req) => {
  const instituteId = getInstituteId(req.user);
  const { matchedCount, modifiedCount } = await Result.updateMany(
    { class: classId, term: termId, institute: instituteId },
    { $set: { isPublished: false } }
  );
  const [cls, term] = await Promise.all([
    Class.findById(classId).select('name').lean(),
    AcademicTerm.findById(termId).select('name').lean(),
  ]);
  logAudit(req, {
    action: 'UNPUBLISH_RESULTS',
    entity: 'Result',
    description: `Unpublished ${modifiedCount} result(s) for class ${cls?.name ?? classId} term ${term?.name ?? termId}`,
    before: { isPublished: true },
    after:  { isPublished: false, count: modifiedCount },
    statusCode: 200,
  });
  return { matched: matchedCount, modified: modifiedCount };
};

export const getPublishStatus = async (classId, termId, req) => {
  const instituteId = getInstituteId(req.user);
  const [total, published] = await Promise.all([
    Result.countDocuments({ class: classId, term: termId, institute: instituteId }),
    Result.countDocuments({ class: classId, term: termId, institute: instituteId, isPublished: true }),
  ]);
  return { total, published, unpublished: total - published };
};
