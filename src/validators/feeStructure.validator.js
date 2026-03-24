import { body, validationResult } from "express-validator";

export const feeStructureCreateRules = [
  body("category").isIn(["all", "class", "student"]).withMessage("Invalid category"),
  body("particulars").isArray({ min: 1 }).withMessage("particulars must be a non-empty array"),
  body("particulars.*.label").notEmpty().withMessage("particular label is required"),
  body("particulars.*.amount").isFloat({ min: 0 }).withMessage("particular amount must be >= 0"),
  body("classId").optional().isMongoId().withMessage("Invalid classId"),
  body("studentId").optional().isMongoId().withMessage("Invalid studentId"),
];

export const feeStructureUpdateRules = [
  body("category").optional().isIn(["all", "class", "student"]).withMessage("Invalid category"),
  body("particulars").optional().isArray({ min: 1 }).withMessage("particulars must be a non-empty array"),
  body("particulars.*.label").optional().notEmpty().withMessage("particular label is required"),
  body("particulars.*.amount").optional().isFloat({ min: 0 }).withMessage("particular amount must be >= 0"),
  body("classId").optional().isMongoId().withMessage("Invalid classId"),
  body("studentId").optional().isMongoId().withMessage("Invalid studentId"),
];

export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  next();
};
