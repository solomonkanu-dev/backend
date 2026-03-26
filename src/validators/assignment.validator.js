import { body, param, validationResult } from 'express-validator';

export const createAssignmentRules = [
  body('title').notEmpty().withMessage('Title is required'),
  body('subjectId').isMongoId().withMessage('Valid subject ID is required'),
  body('description').optional().isString(),
  body('dueDate').exists().withMessage('dueDate is required').bail().isISO8601().toDate().withMessage('Invalid due date'),
  body('totalMarks').optional().isNumeric().withMessage('totalMarks must be a number'),
  body('status').optional().isIn(['draft', 'published']).withMessage('status must be draft or published'),
];

export const updateAssignmentRules = [
  param('id').isMongoId().withMessage('Invalid assignment ID'),
  body('title').optional().notEmpty().withMessage('Title cannot be empty'),
  body('description').optional().isString(),
  body('dueDate').optional().isISO8601().toDate().withMessage('Invalid due date'),
  body('totalMarks').optional().isNumeric().withMessage('totalMarks must be a number'),
  body('status').optional().isIn(['draft', 'published']).withMessage('status must be draft or published'),
];

export const assignmentIdParam = [param('id').isMongoId().withMessage('Invalid assignment ID')];

export const getBySubjectRules = [param('subjectId').isMongoId().withMessage('Invalid subject ID')];

export const getByClassRules = [param('classId').isMongoId().withMessage('Invalid class ID')];

export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  next();
};
