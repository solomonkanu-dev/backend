import * as classFeeService from '../services/classFee.service.js';

export const assignFeesToClass = async (req, res, next) => {
  try {
    const result = await classFeeService.assignFeesToClass(req.body, req.user);
    res.status(200).json({ message: 'Fees assigned to class successfully', assigned: result.assigned, skipped: result.skipped });
  } catch (err) {
    next(err);
  }
};
