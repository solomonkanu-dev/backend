import { body, param, validationResult } from 'express-validator';

export const submitAssignmentRules = [
  body('assignmentId').isMongoId().withMessage('Valid assignment ID is required'),
  body('content').optional(),
];

export const gradeSubmissionRules = [
  param('submissionId').isMongoId().withMessage('Invalid submission ID'),
  body('marks').optional().isNumeric().withMessage('marks must be a number'),
  body('grade').optional(),
];

export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  next();
};
