import { body, param, validationResult } from 'express-validator';

export const createAssignmentRules = [
  body('title').notEmpty().withMessage('Title is required'),
  body('description').optional(),
  body('subject').isMongoId().withMessage('Valid subject ID is required'),
  body('dueDate').optional().isISO8601().toDate().withMessage('Invalid due date'),
];

export const getBySubjectRules = [param('subjectId').isMongoId().withMessage('Invalid subject ID')];

export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  next();
};
