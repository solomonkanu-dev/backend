import { Router } from "express";
import User from "../models/user.js";
import {
  resetPassword,
  requestAdminSignup,
  createInstitute,
  getAllStudents,
  getAllLecturers,
  getAllClasses,
  getStudentsByClass,
  getAllAssignments,
  getResultsBySubject,
  getResultsByClass,
  getStudentAssignments,
  getMyInstitute,
  updateInstitute,
  createFeeParticular,
  createStudent,
  createLecturer,
  getLecturerById,
  getStudentById,
  getClassById,
  getLecturerClasses,
  getStudentClasses,
  suspendUser,
  unsuspendUser,
  deleteUser,
} from "../controllers/admin.controller.js";
import auth from "../middlewares/auth.js";
import { adminOnly } from "../middlewares/adminOnly.js";
import { enforcePlanLimits } from "../middlewares/enforcePlanLimits.js";
import {
  assignFeeToStudent,
  getStudentsWithFees,
  getFeesForStudent,
  getStructuresForStudent,
} from "../controllers/studentFee.controller.js";
import {
  getClassesWithSubjectSummary
} from "../controllers/class.controller.js";
import { assignFeesToClass } from "../controllers/classFee.controller.js";
import { assignMarks } from "../controllers/result.controller.js";
import {
  getFeeSummary,
  getFeeByClass,
  getFeeByStatus,
  getDefaulters,
  getCollectionTrend,
} from "../controllers/feeAnalysis.controller.js";
import { requestAdminSignupRules, createInstituteRules, feesArrayRules, assignFeeToStudentRules, resetPasswordRules, validate } from "../validators/admin.validator.js";
import { updateStudentLifecycle, getClassRankings, getReportCard, updateStudent, updateLecturer, createParent, getParents, linkStudentToParent, unlinkStudentFromParent, revokeParentAccess, restoreParentAccess, bulkPromoteStudents, getPromotionEligibility } from "../controllers/admin.controller.js";
import { recordPayment, getStudentPayments, getPaymentReceipt } from "../controllers/feePayment.controller.js";
import { createOrUpdateTimetable, updateTimetable, deleteTimetable } from "../controllers/timetable.controller.js";
import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from "../controllers/calendar.controller.js";
import { getStudentQR, toggleStudentQR } from "../controllers/qr.attendance.controller.js";

const router = Router();

/**
 * Admin creates Lecturer or Student
 */

router.post("/admin-request", requestAdminSignupRules, validate, requestAdminSignup);

router.post("/create-student", auth, adminOnly, enforcePlanLimits('students'), createStudent);
router.post("/create-lecturer", auth, adminOnly, enforcePlanLimits('lecturers'), createLecturer);

/**
 * Admin resets password
 */
router.patch(
  "/reset-password/:userId",
  auth,
  adminOnly,
  resetPasswordRules,
  validate,
  (req, res, next) => {
    resetPassword(req, res, next);
  }
);

router.post(
  "/create-institute",
  auth,
  adminOnly,
  createInstituteRules,
  validate,
  async (req, res, next) => {
    createInstitute(req, res, next);
  }
);

router.post(
  "/fees/create",
  auth,
  adminOnly,
  feesArrayRules,
  validate,
  (req, res, next) => {
    createFeeParticular(req, res, next);
  }
);

router.post(
  "/fees/assign",
  auth,
  adminOnly,
  assignFeeToStudentRules,
  validate,
  (req, res, next) => {
    assignFeeToStudent(req, res, next);
  }
);

router.get("/fees/students", auth, adminOnly, getStudentsWithFees);
router.get("/fees/student/:studentId", auth, adminOnly, getFeesForStudent);
router.get("/fees/structures/for-student/:studentId", auth, adminOnly, getStructuresForStudent);
router.get("/students", auth, adminOnly, getAllStudents);
router.get("/students/:studentId", auth, adminOnly, getStudentById);
router.get("/lecturers", auth, adminOnly, getAllLecturers);
router.get("/lecturers/:lecturerId", auth, adminOnly, getLecturerById);
router.get("/classes", auth, adminOnly, getAllClasses);
router.get("/classes/:classId/students", auth, adminOnly, getStudentsByClass);
router.get("/classes/:classId", auth, adminOnly, getClassById);
router.get(
  "/lecturers/:lecturerId/classes",
  auth,
  adminOnly,
  getLecturerClasses
);
router.get("/class/class-with-subjects", auth, adminOnly, getClassesWithSubjectSummary)
router.get("/students/:studentId/classes", auth, adminOnly, getStudentClasses);
router.get("/students/:studentId/assignments", auth, adminOnly, getStudentAssignments);
router.get("/assignments", auth, adminOnly, getAllAssignments);
router.get("/results/class/:classId", auth, adminOnly, getResultsByClass);
router.get("/results/subject/:subjectId", auth, adminOnly, getResultsBySubject);
router.get("/my-institute", auth, adminOnly, getMyInstitute);
router.put("/my-institute/update", auth, adminOnly, updateInstitute);
router.post("/fees/assign/class", auth, adminOnly, assignFeesToClass);
router.post("/result/assign-marks", auth, assignMarks);

// Account management
router.patch("/users/:userId/suspend", auth, adminOnly, suspendUser);
router.patch("/users/:userId/unsuspend", auth, adminOnly, unsuspendUser);
router.delete("/users/:userId", auth, adminOnly, deleteUser);

// Fee analysis
router.get("/fee-analysis/summary", auth, adminOnly, getFeeSummary);
router.get("/fee-analysis/by-class", auth, adminOnly, getFeeByClass);
router.get("/fee-analysis/by-status", auth, adminOnly, getFeeByStatus);
router.get("/fee-analysis/defaulters", auth, adminOnly, getDefaulters);
router.get("/fee-analysis/collection-trend", auth, adminOnly, getCollectionTrend);

// Report card
router.get("/report-card/:studentId", auth, adminOnly, getReportCard);

// Fee payments
router.post("/fees/student/:studentId/payment", auth, adminOnly, recordPayment);
router.get("/fees/student/:studentId/payments", auth, adminOnly, getStudentPayments);
router.get("/fees/payment/:paymentId/receipt", auth, adminOnly, getPaymentReceipt);

// Update student / lecturer profile
router.patch("/students/:studentId", auth, adminOnly, updateStudent);
router.patch("/lecturers/:lecturerId", auth, adminOnly, updateLecturer);

// Student lifecycle
router.patch("/students/:studentId/lifecycle", auth, adminOnly, updateStudentLifecycle);

// Rankings
router.get("/results/class/:classId/rankings", auth, adminOnly, getClassRankings);

// Bulk promotion
router.get("/promote/eligibility/:classId", auth, adminOnly, getPromotionEligibility);
router.post("/promote/bulk", auth, adminOnly, bulkPromoteStudents);
// Preview: students eligible for promotion from a class
router.get("/promote/preview/:classId", auth, adminOnly, async (req, res) => {
  try {
    const instituteId = req.user.institute?._id || req.user.institute;
    const { classId } = req.params;
    const students = await User.find({ class: classId, institute: instituteId, role: "student" })
      .select("fullName email lifecycleStatus")
      .lean();
    res.json({ data: students });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// Parent management
router.post("/parents", auth, adminOnly, createParent);
router.get("/parents", auth, adminOnly, getParents);
router.post("/parents/link-student", auth, adminOnly, linkStudentToParent);
router.post("/parents/unlink-student", auth, adminOnly, unlinkStudentFromParent);
router.patch("/parents/:parentId/revoke", auth, adminOnly, revokeParentAccess);
router.patch("/parents/:parentId/restore", auth, adminOnly, restoreParentAccess);

// Notification settings
import { getSettings, updateSettings, sendTestEmail, getEmailLogs } from '../controllers/notificationSettings.controller.js';

router.get('/notification-settings', auth, adminOnly, getSettings);
router.patch('/notification-settings', auth, adminOnly, updateSettings);
router.post('/notification-settings/test-email', auth, adminOnly, sendTestEmail);
router.get('/notification-settings/logs', auth, adminOnly, getEmailLogs);

// Timetable — admin write operations
router.post("/timetable", auth, adminOnly, createOrUpdateTimetable);
router.put("/timetable/:id", auth, adminOnly, updateTimetable);
router.delete("/timetable/:id", auth, adminOnly, deleteTimetable);

// Academic Calendar — admin write operations
router.post("/calendar", auth, adminOnly, createCalendarEvent);
router.put("/calendar/:id", auth, adminOnly, updateCalendarEvent);
router.delete("/calendar/:id", auth, adminOnly, deleteCalendarEvent);

// QR code management
router.get("/students/:studentId/qr", auth, adminOnly, getStudentQR);
router.patch("/students/:studentId/qr", auth, adminOnly, toggleStudentQR);

export default router;
