import { Router } from 'express';
import { param } from 'express-validator';
import {
  createExam,
  getExams,
  getExamsByClass,
  getExamById,
  updateExam,
  deleteExam,
} from '../controllers/exam.controller.js';
import auth from '../middlewares/auth.js';

const router = Router();

// Admin: list all exams for institute (filter by termId, classId)
router.get('/', auth, getExams);

// Lecturer / Student: list exams for a specific class
router.get('/class/:classId', auth, getExamsByClass);

// Get a single exam by ID
router.get('/:examId', auth, getExamById);

// Admin: create exam
router.post('/', auth, createExam);

// Admin: update exam
router.patch('/:examId', auth, updateExam);

// Admin: delete exam
router.delete('/:examId', auth, deleteExam);

export default router;
