import { Router } from "express";
import auth from "../middlewares/auth.js";
import { adminOnly } from "../middlewares/adminOnly.js";
import superAdminOnly from "../middlewares/superAdmin.js";
import { getAuditLogs, getAuditSummary, getUserAuditLogs } from "../controllers/auditLog.controller.js";

const router = Router();

// Middleware that allows both super_admin and admin roles
const adminOrSuperAdmin = (req, res, next) => {
  if (!["super_admin", "admin"].includes(req.user?.role)) {
    return res.status(403).json({ success: false, message: "Access denied" });
  }
  next();
};

router.get("/", auth, adminOrSuperAdmin, getAuditLogs);
router.get("/summary", auth, adminOrSuperAdmin, getAuditSummary);
router.get("/user/:userId", auth, adminOrSuperAdmin, getUserAuditLogs);

export default router;
