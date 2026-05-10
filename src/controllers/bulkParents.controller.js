import * as bulkSvc from '../services/bulkParents.service.js';

export const bulkImportParents = async (req, res, next) => {
  try {
    const result = await bulkSvc.bulkImportParents(req.body.parents, req);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};
