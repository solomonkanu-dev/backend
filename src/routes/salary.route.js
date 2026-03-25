import { Router } from "express";
import {
  addSalary,
  getAllSalaries,
  getLecturerSalaries,
  getSalaryById,
  updateSalary,
  markAsPaid,
  getMonthlySalarySummary,
  deleteSalary,
} from "../controllers/salary.controller.js";
import auth from "../middlewares/auth.js";
import { adminOnly } from "../middlewares/adminOnly.js";

const router = Router();

// Admin routes
router.post("/pay-salary", auth, adminOnly, addSalary);
router.get("/salary-slips", auth, adminOnly, getAllSalaries);
router.get("/summary/:salaryMonth", auth, adminOnly, getMonthlySalarySummary);

// Lecturer routes (view own salary)
router.get("/lecturer/:lecturerId", auth, getLecturerSalaries);

router.get("/:id", auth, adminOnly, getSalaryById);
router.put("/:id", auth, adminOnly, updateSalary);
router.patch("/:id/mark-paid", auth, adminOnly, markAsPaid);
router.delete("/:id", auth, adminOnly, deleteSalary);

export default router;
