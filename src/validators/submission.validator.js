import { body, param, validationResult } from 'express-validator';

export const submitAssignmentRules = [
  body('assignmentId').isMongoId().withMessage('Valid assignment ID is required'),
  body('fileUrl').optional().isURL().withMessage('fileUrl must be a valid URL'),
  body('content').optional().isString(),
];

export const gradeSubmissionRules = [
  param('submissionId').isMongoId().withMessage('Invalid submission ID'),
  // Accept either 'score' or 'marks' for frontend compatibility
  body().custom((_, { req }) => {
    const val = req.body.score ?? req.body.marks;
    if (val === undefined || val === null) throw new Error('score is required');
    if (isNaN(Number(val))) throw new Error('score must be a number');
    return true;
  }),
  body('feedback').optional().isString(),
];

export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  next();
};
