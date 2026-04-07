import * as resultService from '../services/result.service.js';

export const assignMarks = async (req, res, next) => {
  try {
    const result = await resultService.assignMarks(req.body, req);
    res.status(200).json({
      statusCode: 200,
      message: 'Marks assigned successfully',
      result,
    });
  } catch (err) {
    next(err);
  }
};
