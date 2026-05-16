import { Router } from "express";
import auth from "../middlewares/auth.js";
import { adminOnly } from "../middlewares/adminOnly.js";
import {
  createTrait,
  getTraits,
  updateTrait,
  deleteTrait,
} from "../controllers/ratingTrait.controller.js";

const router = Router();

router.get("/", auth, getTraits);
router.post("/", auth, adminOnly, createTrait);
router.put("/:id", auth, adminOnly, updateTrait);
router.delete("/:id", auth, adminOnly, deleteTrait);

export default router;
