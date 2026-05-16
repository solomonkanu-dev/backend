import * as templateService from '../services/reportCardTemplate.service.js';

export const createTemplate = async (req, res, next) => {
  try {
    const data = await templateService.createTemplate(req.body, req.user);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getTemplates = async (req, res, next) => {
  try {
    const data = await templateService.getTemplates(req.user);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getDefaultTemplate = async (req, res, next) => {
  try {
    const data = await templateService.getDefaultTemplate(req.user);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getTemplateById = async (req, res, next) => {
  try {
    const data = await templateService.getTemplateById(req.params.id, req.user);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const updateTemplate = async (req, res, next) => {
  try {
    const data = await templateService.updateTemplate(req.params.id, req.body, req.user);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const setDefaultTemplate = async (req, res, next) => {
  try {
    const template = await templateService.setDefaultTemplate(req.params.id, req.user);
    res.json({ success: true, message: `"${template.name}" is now the default report card template` });
  } catch (err) {
    next(err);
  }
};

export const deleteTemplate = async (req, res, next) => {
  try {
    await templateService.deleteTemplate(req.params.id, req.user);
    res.json({ success: true, message: 'Report card template deleted successfully' });
  } catch (err) {
    next(err);
  }
};
