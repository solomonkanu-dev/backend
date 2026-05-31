import { body, validationResult } from 'express-validator';

export const updateRulesRules = [
  body('sections').isArray({ min: 1 }).withMessage('sections must be a non-empty array'),
  body('sections.*.id').isString().trim().notEmpty().withMessage('Each section requires an id'),
  body('sections.*.title').isString().trim().notEmpty().withMessage('Each section requires a title'),
  body('sections.*.content').optional({ nullable: true }).isString(),
  body('sections.*.order').optional().isInt({ min: 0 }).withMessage('order must be a non-negative integer'),
];

export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  next();
};
