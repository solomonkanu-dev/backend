import { Router } from "express";
import auth from "../middlewares/auth.js";
import { getReportCard, saveReportCardMeta } from "../controllers/reportCard.controller.js";

const router = Router();

// Accessible to admins and to the form teacher of the student's class
router.get("/:studentId", auth, getReportCard);
router.put("/:studentId/meta", auth, saveReportCardMeta);

export default router;
