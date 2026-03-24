import { Router } from 'express';
import { getLecturers, getLecturerById } from '../controllers/lecturer.controller.js';
import auth from '../middlewares/auth.js';
import {adminOnly} from '../middlewares/adminOnly.js';

const router = Router();

router.get('/employee', auth, adminOnly, getLecturers);
router.get('/get-lecturer/:id', auth, adminOnly, getLecturerById);

export default router;
