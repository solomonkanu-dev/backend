import { Router } from 'express';
import { login, logout } from '../controllers/auth.controller.js';
import auth from '../middlewares/auth.js';
import { loginRules, validate } from '../validators/auth.validator.js';

const router = Router();

router.post('/login', loginRules, validate, login);

// router.get('/me', auth, getMe);

router.post('/logout', logout);

export default router;
