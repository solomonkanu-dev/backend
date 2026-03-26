import express from "express";
import {
  createAssignment,
  getAssignmentsBySubject,
  getAssignmentsByClass,
  getMyAssignments,
  getAssignmentById,
  updateAssignment,
  deleteAssignment,
} from "../controllers/assignment.controller.js";
import auth from "../middlewares/auth.js";
import {
  createAssignmentRules,
  updateAssignmentRules,
  assignmentIdParam,
  getBySubjectRules,
  getByClassRules,
  validate,
} from "../validators/assignment.validator.js";

const router = express.Router();

router.post("/", auth, createAssignmentRules, validate, createAssignment);
router.get("/my", auth, getMyAssignments);
router.get("/subject/:subjectId", auth, getBySubjectRules, validate, getAssignmentsBySubject);
router.get("/class/:classId", auth, getByClassRules, validate, getAssignmentsByClass);
router.get("/:id", auth, assignmentIdParam, validate, getAssignmentById);
router.patch("/:id", auth, updateAssignmentRules, validate, updateAssignment);
router.delete("/:id", auth, assignmentIdParam, validate, deleteAssignment);

// Legacy route alias
router.post("/create-assignment", auth, createAssignmentRules, validate, createAssignment);

export default router;
