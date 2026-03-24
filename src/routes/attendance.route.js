import express from "express";
import {
  markAttendance,
  getMyAttendance,
  getSubjectAttendance,
  getMyAttendanceSummary,
  checkExamEligibility,
  attendanceAnalytics,
  attendanceSummary,
} from "../controllers/attendance.controller.js";
import auth from "../middlewares/auth.js";
import {
  markAttendanceRules,
  subjectIdParam,
  validate,
} from "../validators/attendance.validator.js";
import {
  markEmployeeAttendance,
  getEmployeeAttendance,
  getEmployeeAttendanceSummary,
} from "../controllers/employee.attendance.controller.js";

const router = express.Router();

router.post("/mark-attendance", auth, markAttendance);
router.get("/get-attendance", auth, getMyAttendance);
router.get("/get-student-attendance/:studentId", auth, attendanceSummary);
router.get(
  "/eligibility/:subjectId",
  auth,
  subjectIdParam,
  validate,
  checkExamEligibility
);
router.get(
  "/analytics/subject/:subjectId",
  auth,
  subjectIdParam,
  validate,
  attendanceAnalytics
);
router.get("/subject", auth, getSubjectAttendance);
router.get("/summary/me", auth, getMyAttendanceSummary);
router.get(
  "/summary/subject/:subjectId",
  auth,
  subjectIdParam,
  validate,
  attendanceAnalytics
);

// Employee attendance routes
router.post("/employee/mark-employee-attendance", auth, markEmployeeAttendance);
router.get("/employee/get-employee-attendance", auth, getEmployeeAttendance);
router.get("/employee/summary/:lecturerId", auth, getEmployeeAttendanceSummary);

export default router;
