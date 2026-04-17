import * as repo from '../repositories/exam.repository.js';
import Subject from '../models/Subject.js';
import Class from '../models/Class.js';
import AcademicTerm from '../models/AcademicTerm.js';
import { AppError } from '../errors/AppError.js';
import { logAudit } from '../utils/audit.js';

const getInstituteId = (user) => user.institute?._id || user.institute;

export const createExam = async (body, req) => {
  if (req.user.role !== 'admin') throw new AppError('Access denied', 403);

  const instituteId = getInstituteId(req.user);
  const { title, subjectId, classId, termId, date, startTime, endTime, examType, totalMarks, venue, instructions } = body;

  if (!title)      throw new AppError('Title is required', 400);
  if (!subjectId)  throw new AppError('Subject is required', 400);
  if (!classId)    throw new AppError('Class is required', 400);
  if (!termId)     throw new AppError('Term is required', 400);
  if (!date)       throw new AppError('Date is required', 400);
  if (!startTime)  throw new AppError('Start time is required', 400);
  if (!endTime)    throw new AppError('End time is required', 400);

  const [subject, cls, term] = await Promise.all([
    Subject.findOne({ _id: subjectId, institute: instituteId }),
    Class.findOne({ _id: classId, institute: instituteId }),
    AcademicTerm.findOne({ _id: termId, institute: instituteId }),
  ]);

  if (!subject) throw new AppError('Subject not found in this institute', 404);
  if (!cls)     throw new AppError('Class not found in this institute', 404);
  if (!term)    throw new AppError('Term not found in this institute', 404);

  const exam = await repo.create({
    title, subject: subjectId, class: classId, term: termId,
    institute: instituteId, date, startTime, endTime,
    examType, totalMarks, venue, instructions,
    createdBy: req.user._id,
  });

  logAudit(req, {
    action: 'CREATE_EXAM',
    entity: 'Exam',
    entityId: exam._id,
    description: `Created exam "${title}"`,
    statusCode: 201,
  });

  return exam;
};

export const getExams = async (query, req) => {
  const instituteId = getInstituteId(req.user);
  const filter = { institute: instituteId };
  if (query.termId)  filter.term  = query.termId;
  if (query.classId) filter.class = query.classId;
  return repo.findByFilter(filter);
};

export const getExamsByClass = async (classId, termId, req) => {
  const instituteId = getInstituteId(req.user);
  const filter = { institute: instituteId, class: classId };
  if (termId) filter.term = termId;
  return repo.findByFilter(filter);
};

export const getExamById = async (examId, req) => {
  const instituteId = getInstituteId(req.user);
  const exam = await repo.findById(examId);
  if (!exam || exam.institute.toString() !== instituteId.toString())
    throw new AppError('Exam not found', 404);
  return exam;
};

export const updateExam = async (examId, body, req) => {
  if (req.user.role !== 'admin') throw new AppError('Access denied', 403);

  const instituteId = getInstituteId(req.user);
  const exam = await repo.findByIdAndInstitute(examId, instituteId);
  if (!exam) throw new AppError('Exam not found', 404);

  const allowedFields = ['title', 'date', 'startTime', 'endTime', 'examType', 'totalMarks', 'venue', 'instructions', 'status'];
  const update = {};
  for (const key of allowedFields) {
    if (body[key] !== undefined) update[key] = body[key];
  }

  const updated = await repo.updateById(examId, update);

  logAudit(req, {
    action: 'UPDATE_EXAM',
    entity: 'Exam',
    entityId: examId,
    description: `Updated exam "${exam.title}"`,
    statusCode: 200,
  });

  return updated;
};

export const deleteExam = async (examId, req) => {
  if (req.user.role !== 'admin') throw new AppError('Access denied', 403);

  const instituteId = getInstituteId(req.user);
  const exam = await repo.findByIdAndInstitute(examId, instituteId);
  if (!exam) throw new AppError('Exam not found', 404);

  await repo.deleteById(examId);

  logAudit(req, {
    action: 'DELETE_EXAM',
    entity: 'Exam',
    entityId: examId,
    description: `Deleted exam "${exam.title}"`,
    statusCode: 200,
  });
};
