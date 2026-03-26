import { body, param, validationResult } from 'express-validator';

export const submitAssignmentRules = [
  body('assignmentId').isMongoId().withMessage('Valid assignment ID is required'),
  body('fileUrl').optional().isURL().withMessage('fileUrl must be a valid URL'),
];

export const gradeSubmissionRules = [
  param('submissionId').isMongoId().withMessage('Invalid submission ID'),
  body('score').exists().withMessage('score is required').bail().isNumeric().withMessage('score must be a number'),
  body('feedback').optional().isString(),
];

export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  next();
};
