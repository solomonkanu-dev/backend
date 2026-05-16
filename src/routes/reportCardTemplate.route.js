import { Router } from "express";
import auth from "../middlewares/auth.js";
import { adminOnly } from "../middlewares/adminOnly.js";
import {
  createTemplate,
  getTemplates,
  getDefaultTemplate,
  getTemplateById,
  updateTemplate,
  setDefaultTemplate,
  deleteTemplate,
} from "../controllers/reportCardTemplate.controller.js";

const router = Router();

router.post("/", auth, adminOnly, createTemplate);
router.get("/", auth, getTemplates);
router.get("/default", auth, getDefaultTemplate);
router.get("/:id", auth, getTemplateById);
router.put("/:id", auth, adminOnly, updateTemplate);
router.patch("/:id/set-default", auth, adminOnly, setDefaultTemplate);
router.delete("/:id", auth, adminOnly, deleteTemplate);

export default router;
