import { Router } from "express";
import auth from "../middlewares/auth.js";
import { adminOnly } from "../middlewares/adminOnly.js";
import {
  createGradingScale,
  getGradingScales,
  getDefaultGradingScale,
  getGradingScaleById,
  updateGradingScale,
  setDefaultGradingScale,
  deleteGradingScale,
} from "../controllers/grading.controller.js";

const router = Router();

router.post("/", auth, adminOnly, createGradingScale);
router.get("/", auth, getGradingScales);
router.get("/default", auth, getDefaultGradingScale);
router.get("/:id", auth, getGradingScaleById);
router.put("/:id", auth, adminOnly, updateGradingScale);
router.patch("/:id/set-default", auth, adminOnly, setDefaultGradingScale);
router.delete("/:id", auth, adminOnly, deleteGradingScale);

export default router;
