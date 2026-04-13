import { AppError } from '../errors/AppError.js';
import * as submissionRepo from '../repositories/submission.repository.js';

export const submitAssignment = async (body, user) => {
  if (user.role !== 'student') {
    throw new AppError('Only students can submit assignments', 403);
  }

  const { assignmentId, fileUrl, content } = body;
  if (!content && !fileUrl) throw new AppError('Content or file is required', 400);

  const assignment = await submissionRepo.findAssignmentForInstitute(assignmentId, user.institute);
  if (!assignment || assignment.status !== 'published') {
    throw new AppError('Assignment not found', 404);
  }

  const exists = await submissionRepo.findOne({ assignment: assignmentId, student: user._id });
  if (exists) throw new AppError('Already submitted', 409);

  const isLate = new Date() > new Date(assignment.dueDate);

  return submissionRepo.create({
    assignment: assignmentId,
    student: user._id,
    fileUrl: fileUrl || '',
    content: content || '',
    isLate,
    status: 'pending',
  });
};

export const resubmitAssignment = async (submissionId, body, user) => {
  if (user.role !== 'student') throw new AppError('Only students can resubmit', 403);

  const { fileUrl, content } = body;
  if (!content && !fileUrl) throw new AppError('Content or file is required', 400);

  const submission = await submissionRepo.findByIdWithAssignment(submissionId);
  if (!submission) throw new AppError('Submission not found', 404);
  if (String(submission.student) !== String(user._id)) throw new AppError('Access denied', 403);

  if (new Date() > new Date(submission.assignment.dueDate)) {
    throw new AppError('Cannot resubmit after the due date', 400);
  }

  submission.content = content || '';
  submission.fileUrl = fileUrl || '';
  submission.isLate = false;
  submission.status = 'pending';
  submission.score = null;
  submission.feedback = '';

  return submissionRepo.save(submission);
};

export const gradeSubmission = async (submissionId, body, user) => {
  if (!['lecturer', 'admin'].includes(user.role)) {
    throw new AppError('Access denied', 403);
  }

  const score = Number(body.score ?? body.marks);
  const { feedback } = body;

  const submission = await submissionRepo.findByIdWithAssignment(submissionId);
  if (!submission) throw new AppError('Submission not found', 404);

  const instituteId = String(user.institute?._id || user.institute);
  if (String(submission.assignment.institute) !== instituteId) {
    throw new AppError('Access denied', 403);
  }

  if (user.role === 'lecturer' && String(submission.assignment.lecturer) !== String(user._id)) {
    throw new AppError('Access denied', 403);
  }

  const totalMarks = submission.assignment.totalMarks ?? 100;
  if (score > totalMarks) {
    throw new AppError(`Score cannot exceed total marks (${totalMarks})`, 400);
  }

  submission.score = score;
  if (feedback !== undefined) submission.feedback = feedback;
  submission.status = 'graded';

  return submissionRepo.save(submission);
};

export const getSubmissionsForAssignment = async (assignmentId, user) => {
  if (!['lecturer', 'admin'].includes(user.role)) {
    throw new AppError('Access denied', 403);
  }

  const assignment = await submissionRepo.findAssignmentForInstitute(assignmentId, user.institute);
  if (!assignment) throw new AppError('Assignment not found', 404);

  if (user.role === 'lecturer' && String(assignment.lecturer) !== String(user._id)) {
    throw new AppError('Access denied', 403);
  }

  return submissionRepo.findByAssignment(assignmentId);
};

export const getMySubmissions = async (user) => {
  if (user.role !== 'student') throw new AppError('Access denied', 403);
  return submissionRepo.findByStudent(user._id);
};
