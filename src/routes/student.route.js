import { Router } from 'express';
import { getStudents, getStudentById } from '../controllers/student.controller.js';
import auth from '../middlewares/auth.js';
import {adminOnly} from '../middlewares/adminOnly.js';

const router = Router();

router.get('/', auth, adminOnly, getStudents);
router.get('/:id', auth, adminOnly, getStudentById);

export default router;
