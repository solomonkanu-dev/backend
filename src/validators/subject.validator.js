import { body, param, validationResult } from 'express-validator';

export const createSubjectRules = [
  body('name').notEmpty().withMessage('Subject name is required'),
  body('class').optional().isMongoId().withMessage('Invalid class ID'),
  body('lecturer').optional().isMongoId().withMessage('Invalid lecturer ID'),
  body('totalMarks').optional().isNumeric().withMessage('totalMarks must be a number'),
];

export const assignLecturerRules = [
  body('subjectId').isMongoId().withMessage('Invalid subject ID'),
  body('lecturerId').isMongoId().withMessage('Invalid lecturer ID'),
];

export const idParamRule = [param('id').isMongoId().withMessage('Invalid subject ID')];

export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  next();
};
