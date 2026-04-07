import { Router } from "express";
import { getTerms } from "../controllers/academicTerm.controller.js";
import auth from "../middlewares/auth.js";

const router = Router();

// Accessible to all authenticated roles (student, lecturer, admin)
router.get("/", auth, getTerms);

export default router;
