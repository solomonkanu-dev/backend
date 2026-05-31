import { Router } from 'express';
import auth from '../middlewares/auth.js';
import { adminOnly } from '../middlewares/adminOnly.js';
import { getRules, updateRules, getDefaults } from '../controllers/ruleBook.controller.js';
import { updateRulesRules, validate } from '../validators/ruleBook.validator.js';

const router = Router();

router.get('/', auth, getRules);
router.get('/defaults', auth, getDefaults);
router.put('/', auth, adminOnly, updateRulesRules, validate, updateRules);

export default router;
