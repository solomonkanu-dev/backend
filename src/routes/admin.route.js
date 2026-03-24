import { Router } from "express";
import {
  //   resetUserPassword,
  requestAdminSignup,
  createInstitute,
  getAllStudents,
  getAllLecturers,
  getAllClasses,
  getStudentsByClass,
  getAllAssignments,
  getResultsBySubject,
  getMyInstitute,
  updateInstitute,
  createFeeParticular,
  createStudent,
  createLecturer,
  getLecturerById,
  getStudentById,
  getClassById,
  
  // resetUserPassword,
  //   createFeeParticular,
} from "../controllers/admin.controller.js";
import auth from "../middlewares/auth.js";
import { adminOnly } from "../middlewares/adminOnly.js";
import {
  assignFeeToStudent,
  getStudentsWithFees,
  getFeesForStudent,
} from "../controllers/studentFee.controller.js";
import {
  getLecturerClasses,
  getStudentClasses,
  getClassesWithSubjectSummary
} from "../controllers/class.controller.js";
import { assignFeesToClass } from "../controllers/classFee.controller.js";
import { assignMarks } from "../controllers/result.controller.js";
import { requestAdminSignupRules, createInstituteRules, feesArrayRules, assignFeeToStudentRules, resetPasswordRules, validate } from "../validators/admin.validator.js";

const router = Router();

/**
 * Admin creates Lecturer or Student
 */

router.post("/admin-request", requestAdminSignupRules, validate, requestAdminSignup);

router.post("/create-student", auth, adminOnly, createStudent);
router.post("/create-lecturer", auth, adminOnly, createLecturer);

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
    resetUserPassword(req, res, next);
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
router.get("/assignments", auth, adminOnly, getAllAssignments);
router.get("/results/class/:classId", auth, adminOnly, getResultsBySubject);
router.get("/results/subject/:subjectId", auth, adminOnly, getResultsBySubject);
router.get("/my-institute", auth, adminOnly, getMyInstitute);
router.put("/my-institute/update", auth, adminOnly, updateInstitute);
router.post("/fees/assign/class", auth, adminOnly, assignFeesToClass);
router.post("/attendance/assign/class", auth, adminOnly, assignFeesToClass);
router.post("/fees/assign/class", auth, adminOnly, assignFeesToClass);
router.post("/result/assign-marks", auth, assignMarks);

export default router;
