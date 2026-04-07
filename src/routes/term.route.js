import { Router } from "express";
import { createTerm, getTerms, updateTerm, deleteTerm, setCurrentTerm } from "../controllers/academicTerm.controller.js";
import auth from "../middlewares/auth.js";
import { adminOnly } from "../middlewares/adminOnly.js";

const router = Router();

router.get("/", auth, adminOnly, getTerms);
router.post("/", auth, adminOnly, createTerm);
router.patch("/:termId/set-current", auth, adminOnly, setCurrentTerm);
router.patch("/:termId", auth, adminOnly, updateTerm);
router.delete("/:termId", auth, adminOnly, deleteTerm);

export default router;
