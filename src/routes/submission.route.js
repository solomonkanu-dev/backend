import express from "express";
import {
  submitAssignment,
  gradeSubmission,
  getSubmissionsForAssignment,
  getMySubmissions,
} from "../controllers/submission.controller.js";
import auth from "../middlewares/auth.js";
import { submitAssignmentRules, gradeSubmissionRules, validate } from "../validators/submission.validator.js";

const router = express.Router();

router.post("/submit-assignment", auth, submitAssignmentRules, validate, submitAssignment);
router.patch("/:submissionId/grade", auth, gradeSubmissionRules, validate, gradeSubmission);
router.get("/assignment/:assignmentId", auth, getSubmissionsForAssignment);
router.get("/me", auth, getMySubmissions);

export default router;
