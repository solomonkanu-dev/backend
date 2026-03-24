import { body, param, validationResult } from 'express-validator';

export const createThemeRules = [
  body('name').notEmpty().withMessage('Theme name is required').trim(),
  body('description').optional().trim(),
  body('primary').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Invalid hex color for primary'),
  body('secondary').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Invalid hex color for secondary'),
  body('accent').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Invalid hex color for accent'),
  body('success').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Invalid hex color for success'),
  body('danger').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Invalid hex color for danger'),
  body('warning').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Invalid hex color for warning'),
  body('info').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Invalid hex color for info'),
  body('dark').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Invalid hex color for dark'),
  body('light').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Invalid hex color for light'),
  body('fontFamily').optional().trim(),
  body('fontSize').optional().isInt({ min: 10, max: 20 }).withMessage('fontSize must be between 10 and 20'),
  body('logo').optional().trim(),
  body('favicon').optional().trim(),
  body('backgroundImage').optional().trim(),
];

export const updateThemeRules = [
  param('id').isMongoId().withMessage('Invalid theme ID'),
  body('name').optional().notEmpty().withMessage('Theme name cannot be empty').trim(),
  body('description').optional().trim(),
  body('primary').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Invalid hex color for primary'),
  body('secondary').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Invalid hex color for secondary'),
  body('accent').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Invalid hex color for accent'),
  body('success').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Invalid hex color for success'),
  body('danger').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Invalid hex color for danger'),
  body('warning').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Invalid hex color for warning'),
  body('info').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Invalid hex color for info'),
  body('dark').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Invalid hex color for dark'),
  body('light').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Invalid hex color for light'),
  body('fontFamily').optional().trim(),
  body('fontSize').optional().isInt({ min: 10, max: 20 }).withMessage('fontSize must be between 10 and 20'),
  body('logo').optional().trim(),
  body('favicon').optional().trim(),
  body('backgroundImage').optional().trim(),
  body('isActive').optional().isBoolean().withMessage('isActive must be true or false'),
];

export const idParamRule = [param('id').isMongoId().withMessage('Invalid theme ID')];

export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  next();
};
