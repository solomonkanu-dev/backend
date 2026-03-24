import express from "express";
import {
  createAssignment,
  getAssignmentsBySubject,
} from "../controllers/assignment.controller.js";
import auth from "../middlewares/auth.js";
import { createAssignmentRules, getBySubjectRules, validate } from "../validators/assignment.validator.js";

const router = express.Router();

router.post("/create-assignment", auth, createAssignmentRules, validate, createAssignment);
router.get("/subject/:subjectId", auth, getBySubjectRules, validate, getAssignmentsBySubject);

export default router;
