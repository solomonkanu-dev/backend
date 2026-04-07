import * as themeService from '../services/theme.service.js';

export const createTheme = async (req, res, next) => {
  try {
    const data = await themeService.createTheme(req.body, req.user);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getThemes = async (req, res, next) => {
  try {
    const result = await themeService.getThemes(req.query, req.user);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

export const getThemeById = async (req, res, next) => {
  try {
    const data = await themeService.getThemeById(req.params.id, req.user);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getActiveTheme = async (req, res, next) => {
  try {
    const data = await themeService.getActiveTheme(req.user, req.query);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const updateTheme = async (req, res, next) => {
  try {
    const data = await themeService.updateTheme(req.params.id, req.body, req.user);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const deleteTheme = async (req, res, next) => {
  try {
    const data = await themeService.deleteTheme(req.params.id, req.user);
    res.json({ success: true, data, message: 'Theme deleted successfully' });
  } catch (err) {
    next(err);
  }
};

export default {
  createTheme,
  getThemes,
  getThemeById,
  getActiveTheme,
  updateTheme,
  deleteTheme,
};
