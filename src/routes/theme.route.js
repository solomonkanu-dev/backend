import { Router } from 'express';
import auth from '../middlewares/auth.js';
import { adminOnly } from '../middlewares/adminOnly.js';
import {
  createTheme,
  getThemes,
  getThemeById,
  getActiveTheme,
  updateTheme,
  deleteTheme,
} from '../controllers/theme.controller.js';
import { createThemeRules, updateThemeRules, idParamRule, validate } from '../validators/theme.validator.js';

const router = Router();

// Create theme (admin only)
router.post('/', auth, adminOnly, createThemeRules, validate, createTheme);

// Get all themes (authenticated)
router.get('/', auth, getThemes);

// Get active theme for institute (public or authenticated)
router.get('/active', getActiveTheme);

// Get specific theme by ID (authenticated)
router.get('/:id', auth, idParamRule, validate, getThemeById);

// Update theme (admin only)
router.put('/:id', auth, adminOnly, updateThemeRules, validate, updateTheme);

// Delete theme (admin only)
router.delete('/:id', auth, adminOnly, idParamRule, validate, deleteTheme);

export default router;
