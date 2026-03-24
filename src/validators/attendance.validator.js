import { body, param, validationResult } from 'express-validator';

export const markAttendanceRules = [
  // require either classId or subjectId
  body().custom((_, { req }) => {
    if (!req.body.classId && !req.body.subjectId) {
      throw new Error('Either classId or subjectId is required');
    }
    return true;
  }),
  body('classId').optional().isMongoId().withMessage('Invalid classId'),
  body('subjectId').optional().isMongoId().withMessage('Invalid subjectId'),
  body('date').exists().withMessage('date is required').bail().isISO8601().toDate().withMessage('Invalid date'),
  body('records').isArray({ min: 1 }).withMessage('records must be a non-empty array'),
  body('records.*.studentId').isMongoId().withMessage('Invalid studentId in records'),
  body('records.*.status').isIn(['present', 'absent']).withMessage('status must be present or absent'),
];

export const subjectIdParam = [param('subjectId').isMongoId().withMessage('Invalid subject ID')];

export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  next();
};
