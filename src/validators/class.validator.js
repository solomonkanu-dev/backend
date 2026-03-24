import { body, param, validationResult } from 'express-validator';

export const createClassRules = [
  body('name').notEmpty().withMessage('Class name is required'),
];

export const assignLecturerRules = [
  body('classId').isMongoId().withMessage('Invalid class ID'),
  body('lecturerId').isMongoId().withMessage('Invalid lecturer ID'),
];

export const idParamRule = [param('id').isMongoId().withMessage('Invalid class ID')];

export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  next();
};
