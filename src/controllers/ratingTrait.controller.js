import * as ratingTraitService from '../services/ratingTrait.service.js';

export const createTrait = async (req, res, next) => {
  try {
    const data = await ratingTraitService.createTrait(req.body, req.user);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getTraits = async (req, res, next) => {
  try {
    const data = await ratingTraitService.getTraits(req.user, req.query.domain);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const updateTrait = async (req, res, next) => {
  try {
    const data = await ratingTraitService.updateTrait(req.params.id, req.body, req.user);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const deleteTrait = async (req, res, next) => {
  try {
    await ratingTraitService.deleteTrait(req.params.id, req.user);
    res.json({ success: true, message: 'Trait deleted successfully' });
  } catch (err) {
    next(err);
  }
};
