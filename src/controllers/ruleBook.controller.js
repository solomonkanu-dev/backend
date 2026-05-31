import * as ruleBookService from '../services/ruleBook.service.js';

export const getRules = async (req, res, next) => {
  try {
    const data = await ruleBookService.getRules(req.user);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const updateRules = async (req, res, next) => {
  try {
    const data = await ruleBookService.updateRules(req.body, req.user);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getDefaults = async (req, res, next) => {
  try {
    res.json({ success: true, data: { sections: ruleBookService.getDefaults() } });
  } catch (err) {
    next(err);
  }
};
