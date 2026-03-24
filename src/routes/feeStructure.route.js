import { Router } from "express";
import auth from "../middlewares/auth.js";
import { adminOnly } from "../middlewares/adminOnly.js";
import {
  createFeeStructure,
  getFeeStructures,
  getFeeStructureById,
  updateFeeStructure,
  deleteFeeStructure,
} from "../controllers/feeStructure.controller.js";
import { feeStructureCreateRules, feeStructureUpdateRules, validate } from "../validators/feeStructure.validator.js";

const router = Router();

router.post("/", auth, adminOnly, feeStructureCreateRules, validate, createFeeStructure);
router.get("/", auth, getFeeStructures);
router.get("/:id", auth, getFeeStructureById);
router.put("/:id", auth, adminOnly, feeStructureUpdateRules, validate, updateFeeStructure);
router.delete("/:id", auth, adminOnly, deleteFeeStructure);

export default router;
