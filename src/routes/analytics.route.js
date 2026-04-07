import { Router } from "express";
import auth from "../middlewares/auth.js";
import {
  getAttendanceSummary,
  getFeeDefaults,
  getAssignmentCompletion,
  getEnrollmentTrends,
} from "../controllers/analytics.controller.js";

const router = Router();

// All analytics endpoints require authentication.
// Role-scoping is handled inside each controller via instituteFilter().
// Super admins see platform-wide data; admins are scoped to their institute.

router.get("/attendance-summary", auth, getAttendanceSummary);
router.get("/fee-defaults", auth, getFeeDefaults);
router.get("/assignment-completion", auth, getAssignmentCompletion);
router.get("/enrollment-trends", auth, getEnrollmentTrends);

export default router;
