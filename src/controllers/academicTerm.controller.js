import * as termService from '../services/academicTerm.service.js';

export const createTerm = async (req, res, next) => {
  try {
    const term = await termService.createTerm({ ...req.body, institute: req.user.institute });
    res.status(201).json({ message: 'Term created', data: term });
  } catch (err) {
    next(err);
  }
};

export const getTerms = async (req, res, next) => {
  try {
    const terms = await termService.getTerms(req.user.institute);
    res.json({ data: terms });
  } catch (err) {
    next(err);
  }
};

export const updateTerm = async (req, res, next) => {
  try {
    const term = await termService.updateTerm(req.params.termId, req.user.institute, req.body);
    res.json({ message: 'Term updated', data: term });
  } catch (err) {
    next(err);
  }
};

export const deleteTerm = async (req, res, next) => {
  try {
    await termService.deleteTerm(req.params.termId, req.user.institute);
    res.json({ message: 'Term deleted' });
  } catch (err) {
    next(err);
  }
};

export const setCurrentTerm = async (req, res, next) => {
  try {
    const term = await termService.setCurrentTerm(req.params.termId, req.user.institute);
    res.json({ message: 'Current term updated', data: term });
  } catch (err) {
    next(err);
  }
};
