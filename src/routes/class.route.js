import { Router } from "express";
import {
  createClass,
  getClasses,
  getClassById,
  assignLecturerToClass,
  addStudentToClass,
  getLecturerClasses,
  getStudentClasses,
  getInstituteClasses,
  getStudentByClass,
} from "../controllers/class.controller.js";
import auth from "../middlewares/auth.js";
import { adminOnly } from "../middlewares/adminOnly.js";
import { createClassRules, assignLecturerRules, idParamRule, validate } from "../validators/class.validator.js";

const router = Router();

router.post("/create-class", auth, adminOnly, createClassRules, validate, createClass);

router.get("/", auth, adminOnly, getClasses);
router.get("/:id", auth, adminOnly, idParamRule, validate, getClassById);
router.get("/:classId/students", auth, getStudentByClass);

router.post("/add-student", auth, adminOnly, addStudentToClass);

router.get("/admin", auth, adminOnly, getInstituteClasses);
router.get("/lecturer", auth, adminOnly, getLecturerClasses);
router.get("/student", auth, adminOnly, getStudentClasses);
router.patch(
  "/assign-lecturer",
  auth,
  adminOnly,
  assignLecturerRules,
  validate,
  assignLecturerToClass
);

export default router;
