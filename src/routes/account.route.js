import { Router } from "express";
import {
  createAccount,
  getAllAccounts,
  getActiveAccounts,
  getAccountById,
  updateAccount,
  deleteAccount,
  toggleAccountStatus,
} from "../controllers/account.controller.js";
import auth from "../middlewares/auth.js";
import { adminOnly } from "../middlewares/adminOnly.js";

const router = Router();

// Create account (admin only)
router.post("/create-account", auth, adminOnly, createAccount);

// Get all accounts
router.get("/get-accounts", auth, getAllAccounts);

// Get active accounts only (must be before /:id)
router.get("/active", auth, getActiveAccounts);

// Toggle account status (admin only) (must be before /:id)
router.patch("/:id/toggle-status", auth, adminOnly, toggleAccountStatus);

// Get account by ID
router.get("/:id", auth, getAccountById);

// Update account (admin only)
router.put("/:id", auth, adminOnly, updateAccount);

// Delete account (admin only)
router.delete("/:id", auth, adminOnly, deleteAccount);

export default router;
