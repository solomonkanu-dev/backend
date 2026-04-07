import * as subjectService from '../services/subject.service.js';

export const createSubjectForClass = async (req, res, next) => {
  try {
    const subject = await subjectService.createSubjectForClass(req.body, req.user);
    res.status(201).json({
      statusCode: 201,
      message: 'Subject assigned to class successfully',
      subject,
    });
  } catch (err) {
    next(err);
  }
};

export const getLecturerSubjects = async (req, res, next) => {
  try {
    const data = await subjectService.getLecturerSubjects(req.user);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

export const getStudentSubjects = async (req, res, next) => {
  try {
    const data = await subjectService.getStudentSubjects(req.user);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

export const getSubjects = async (req, res, next) => {
  try {
    const data = await subjectService.getSubjects(req.user);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

export const getSubjectById = async (req, res, next) => {
  try {
    const data = await subjectService.getSubjectById(req.params.id);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

export const assignLecturerToSubject = async (req, res, next) => {
  try {
    const subject = await subjectService.assignLecturerToSubject(req.body);
    res.json({ message: 'Lecturer assigned to subject successfully', subject });
  } catch (err) {
    next(err);
  }
};
