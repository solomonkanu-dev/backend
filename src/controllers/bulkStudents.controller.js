import * as bulkSvc from '../services/bulkStudents.service.js';

export const bulkImportStudents = async (req, res, next) => {
  try {
    const result = await bulkSvc.bulkImportStudents(req.body.students, req);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};
