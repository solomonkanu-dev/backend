import { Router } from 'express';
import { login, logout, getMe, changePassword } from '../controllers/auth.controller.js';
import auth from '../middlewares/auth.js';
import { loginRules, validate } from '../validators/auth.validator.js';

const router = Router();

router.post('/login', loginRules, validate, login);

router.get('/me', auth, getMe);

router.post('/change-password', auth, changePassword);

router.post('/logout', logout);

export default router;
