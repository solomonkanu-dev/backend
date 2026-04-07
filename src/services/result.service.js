import { AppError } from '../errors/AppError.js';
import { resolveGrade } from './grading.service.js';
import * as resultRepo from '../repositories/result.repository.js';
import User from '../models/user.js';
import Subject from '../models/Subject.js';
import { logAudit } from '../utils/audit.js';
import { sendEmailNotification } from '../utils/email.js';

export const assignMarks = async (body, req) => {
  const { user } = req;
  if (!['admin', 'lecturer'].includes(user.role)) {
    throw new AppError('Access denied', 403);
  }

  const { studentId, subjectId, classId, marksObtained } = body;
  const instituteId = user.institute?._id || user.institute;

  const student = await User.findOne({ _id: studentId, role: 'student', institute: instituteId });
  if (!student) throw new AppError('Student not found', 404);

  const subject = await Subject.findOne({ _id: subjectId, class: classId, institute: instituteId });
  if (!subject) throw new AppError('Subject not found', 404);

  if (user.role === 'lecturer' && !subject.lecturer.equals(user._id)) {
    throw new AppError('You are not assigned to this subject', 403);
  }

  if (marksObtained > subject.totalMarks) {
    throw new AppError('Marks exceed total marks', 400);
  }

  const percentage = subject.totalMarks > 0
    ? Math.round((marksObtained / subject.totalMarks) * 100)
    : marksObtained;

  const grade = await resolveGrade(instituteId, percentage);

  const result = await resultRepo.findOneAndUpsert(
    { student: studentId, subject: subjectId, class: classId },
    { marksObtained, totalScore: subject.totalMarks, grade, institute: instituteId }
  );

  logAudit(req, {
    action: 'ASSIGN_MARKS',
    entity: 'Result',
    entityId: result._id,
    description: `Assigned ${marksObtained} marks (grade ${grade}) to student ${studentId} for subject ${subjectId}`,
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
      totalMarks: subject.totalMarks ?? 100,
      grade: result.grade ?? 'N/A',
    },
  }).catch(() => {});

  return result;
};
