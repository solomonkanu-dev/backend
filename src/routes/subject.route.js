import { Router } from "express";
import {
  createSubjectForClass as createSubject,
  getSubjects,
  getSubjectById,
  assignLecturerToSubject,
  getLecturerSubjects,
  getStudentSubjects,
} from "../controllers/subject.controller.js";
import auth from "../middlewares/auth.js";
import { adminOnly } from "../middlewares/adminOnly.js";
import { createSubjectRules, assignLecturerRules, idParamRule, validate } from "../validators/subject.validator.js";

const router = Router();

router.post("/create-subject", auth, adminOnly, createSubjectRules, validate, createSubject);

router.get("/lecturer", auth, getLecturerSubjects);
router.get("/student", auth, getStudentSubjects);

router.get("/", auth, adminOnly, getSubjects);
router.get("/:id", auth, adminOnly, idParamRule, validate, getSubjectById);

router.patch(
  "/assign-lecturer",
  auth,
  adminOnly,
  assignLecturerRules,
  validate,
  assignLecturerToSubject
);

export default router;
