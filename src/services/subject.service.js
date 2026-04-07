import { AppError } from '../errors/AppError.js';
import * as subjectRepo from '../repositories/subject.repository.js';

export const createSubjectForClass = async (body, user) => {
  if (!['admin', 'lecturer'].includes(user.role)) {
    throw new AppError('Access denied', 403);
  }

  if (!user.institute) {
    throw new AppError('Institute required', 400);
  }

  const { name, classId, lecturerId, totalMarks } = body;
  const instituteId = user.institute?._id || user.institute;

  const classDoc = await subjectRepo.findClassById(classId, instituteId);
  if (!classDoc) throw new AppError('Class not found', 404);

  const subject = await subjectRepo.create({
    name,
    class: classId,
    lecturer: lecturerId || null,
    totalMarks: totalMarks || 100,
    institute: instituteId,
  });

  await subjectRepo.addToClass(classId, subject._id);

  return subject;
};

export const getLecturerSubjects = async (user) =>
  subjectRepo.findByLecturer(user._id);

export const getStudentSubjects = async (user) =>
  subjectRepo.findByClass(user.class);

export const getSubjects = async (user) =>
  subjectRepo.findByInstitute(user.institute);

export const getSubjectById = async (id) => {
  const subject = await subjectRepo.findById(id);
  if (!subject) throw new AppError('Subject not found', 404);
  return subject;
};

export const assignLecturerToSubject = async (body) => {
  const { subjectId, lecturerId } = body;

  const subject = await subjectRepo.findById(subjectId);
  if (!subject) throw new AppError('Subject not found', 404);

  const { default: User } = await import('../models/user.js');
  const lecturer = await User.findById(lecturerId);
  if (!lecturer || lecturer.role !== 'lecturer') {
    throw new AppError('Lecturer not found', 404);
  }

  subject.lecturer = lecturerId;
  return subjectRepo.save(subject);
};
