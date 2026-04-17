import * as examService from '../services/exam.service.js';

export const createExam = async (req, res, next) => {
  try {
    const data = await examService.createExam(req.body, req);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getExams = async (req, res, next) => {
  try {
    const data = await examService.getExams(req.query, req);
    res.json({ success: true, total: data.length, data });
  } catch (err) {
    next(err);
  }
};

export const getExamsByClass = async (req, res, next) => {
  try {
    const data = await examService.getExamsByClass(req.params.classId, req.query.termId, req);
    res.json({ success: true, total: data.length, data });
  } catch (err) {
    next(err);
  }
};

export const getExamById = async (req, res, next) => {
  try {
    const data = await examService.getExamById(req.params.examId, req);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const updateExam = async (req, res, next) => {
  try {
    const data = await examService.updateExam(req.params.examId, req.body, req);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const deleteExam = async (req, res, next) => {
  try {
    await examService.deleteExam(req.params.examId, req);
    res.json({ success: true, message: 'Exam deleted successfully' });
  } catch (err) {
    next(err);
  }
};
