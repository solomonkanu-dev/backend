import { Router } from "express";
import auth from "../middlewares/auth.js";
import { parentOnly } from "../middlewares/parentOnly.js";
import {
  getMyChildren,
  getChildAttendance,
  getChildAttendanceStats,
  getChildResults,
  getChildFees,
  getChildAssignments,
  getAnnouncements,
  getChildPromotionHistory,
  getChildPayments,
  getChildPaymentReceipt,
} from "../controllers/parent.controller.js";

const router = Router();

router.get("/my-children", auth, parentOnly, getMyChildren);
router.get("/child/:studentId/attendance", auth, parentOnly, getChildAttendance);
router.get("/child/:studentId/attendance-stats", auth, parentOnly, getChildAttendanceStats);
router.get("/child/:studentId/results", auth, parentOnly, getChildResults);
router.get("/child/:studentId/fees", auth, parentOnly, getChildFees);
router.get("/child/:studentId/assignments", auth, parentOnly, getChildAssignments);
router.get("/announcements", auth, parentOnly, getAnnouncements);
router.get("/child/:studentId/promotion-history", auth, parentOnly, getChildPromotionHistory);
router.get("/child/:studentId/payments", auth, parentOnly, getChildPayments);
router.get("/child/:studentId/payments/:paymentId/receipt", auth, parentOnly, getChildPaymentReceipt);

export default router;
