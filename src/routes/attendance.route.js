import express from "express";
import {
  markAttendance,
  getMyAttendance,
  getSubjectAttendance,
  getMyAttendanceSummary,
  checkExamEligibility,
  attendanceAnalytics,
  attendanceSummary,
  getStudentsForAttendance,
  getClassWiseReport,
} from "../controllers/attendance.controller.js";
import auth from "../middlewares/auth.js";
import {
  markAttendanceRules,
  classIdParam,
  validate,
} from "../validators/attendance.validator.js";
import {
  markEmployeeAttendance,
  getEmployeeAttendance,
  getEmployeeAttendanceSummary,
} from "../controllers/employee.attendance.controller.js";
import {
  scanQR,
  finalizeQRAttendance,
  getQRSession,
} from "../controllers/qr.attendance.controller.js";

const router = express.Router();

// Step 1: fetch students for a class+subject before marking attendance
router.get("/students", auth, getStudentsForAttendance);

router.post("/mark-attendance", auth, markAttendanceRules, validate, markAttendance);
router.get("/get-attendance", auth, getMyAttendance);
router.get("/get-student-attendance/:studentId", auth, attendanceSummary);
router.get(
  "/eligibility/:classId",
  auth,
  classIdParam,
  validate,
  checkExamEligibility
);
router.get(
  "/analytics/class/:classId",
  auth,
  classIdParam,
  validate,
  attendanceAnalytics
);
router.get("/subject", auth, getSubjectAttendance);
router.get("/summary/me", auth, getMyAttendanceSummary);
router.get("/report/class", auth, getClassWiseReport);
router.get(
  "/summary/class/:classId",
  auth,
  classIdParam,
  validate,
  attendanceAnalytics
);

// Employee attendance routes
router.post("/employee/mark-employee-attendance", auth, markEmployeeAttendance);
router.get("/employee/get-employee-attendance", auth, getEmployeeAttendance);
router.get("/employee/summary/:lecturerId", auth, getEmployeeAttendanceSummary);

// QR attendance routes
router.post("/qr/scan", auth, scanQR);
router.post("/qr/finalize", auth, finalizeQRAttendance);
router.get("/qr/session/:classId", auth, getQRSession);

export default router;
