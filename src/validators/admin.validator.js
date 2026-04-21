import { body, param, validationResult } from 'express-validator';

export const requestAdminSignupRules = [
  body('fullName').notEmpty().withMessage('Full name required'),
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 7 }).withMessage('Password must be at least 7 characters'),
];

export const createStudentRules = [
  body('fullName').notEmpty().withMessage('Full name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('classId').isMongoId().withMessage('Valid class ID is required'),
];

export const createLecturerRules = [
  body('fullName').notEmpty().withMessage('Full name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
];

export const createInstituteRules = [
  body('name').notEmpty().withMessage('Institute name required'),
  body('address').optional(),
  body('phoneNumber').optional(),
  body('targetLine').optional(),
  body('website').optional(),
  body('country').optional(),
  body('email').optional().isEmail().withMessage('Invalid email'),
  body('logo').optional(),
];

export const feesArrayRules = [
  body('fees').isArray({ min: 1 }).withMessage('Fees must be a non-empty array'),
  body('fees.*.title').notEmpty().withMessage('Fee title is required'),
  body('fees.*.amount').isNumeric().withMessage('Amount must be a number'),
];

export const assignFeeToStudentRules = [
  body('studentId').isMongoId().withMessage('Valid student ID required'),
];

export const resetPasswordRules = [
  param('userId').isMongoId().withMessage('Invalid user ID'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
];

export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  next();
};
