import Salary from "../models/Salary.js";
import User from "../models/user.js";
import mongoose from "mongoose";

// Create/Add salary record
export const addSalary = async (req, res) => {
  try {
    // Only admin can add salary
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Only admins can add salary records" });
    }

    const { lecturerId, role, salaryMonth, date, salary, bonus, deduction, remarks } = req.body;

    if (!lecturerId || !role || !salaryMonth || !date || salary === undefined) {
      return res.status(400).json({ message: "lecturerId, role, salaryMonth, date, and salary are required" });
    }

    // Validate lecturer exists and belongs to the institute
    const lecturer = await User.findOne({
      _id: lecturerId,
      role: { $in: ["lecturer", "admin"] },
      institute: req.user.institute,
    });

    if (!lecturer) {
      return res.status(404).json({ message: "Lecturer not found" });
    }

    // Check if salary already exists for this month
    const existing = await Salary.findOne({
      lecturer: lecturerId,
      institute: req.user.institute,
      salaryMonth,
    });

    if (existing) {
      return res.status(409).json({ message: "Salary already recorded for this month" });
    }

    const newSalary = await Salary.create({
      lecturer: lecturerId,
      institute: req.user.institute,
      role,
      salaryMonth,
      date,
      salary,
      bonus: bonus || 0,
      deduction: deduction || 0,
      remarks: remarks || "",
    });

    res.status(201).json({
      message: "Salary record created successfully",
      data: newSalary,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all salary records for an institute
export const getAllSalaries = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { salaryMonth, status, page = 1, limit = 10 } = req.query;

    const match = { institute: req.user.institute };

    if (salaryMonth) match.salaryMonth = salaryMonth;
    if (status) match.status = status;

    const skip = (page - 1) * limit;

    const salaries = await Salary.find(match)
      .populate("lecturer", "fullName email lecturerProfile")
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Salary.countDocuments(match);

    res.json({
      statusCode: 200,
      total,
      count: salaries.length,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: salaries,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get salary records for a specific lecturer
export const getLecturerSalaries = async (req, res) => {
  try {
    const { lecturerId } = req.params;
    const { salaryMonth, status } = req.query;

    if (!lecturerId) {
      return res.status(400).json({ message: "lecturerId is required" });
    }

    // Validate lecturer exists
    const lecturer = await User.findOne({
      _id: lecturerId,
      institute: req.user.institute,
    });

    if (!lecturer) {
      return res.status(404).json({ message: "Lecturer not found" });
    }

    const match = {
      lecturer: new mongoose.Types.ObjectId(lecturerId),
      institute: new mongoose.Types.ObjectId(req.user.institute),
    };

    if (salaryMonth) match.salaryMonth = salaryMonth;
    if (status) match.status = status;

    const salaries = await Salary.find(match)
      .sort({ date: -1 })
      .lean();

    res.json({
      statusCode: 200,
      lecturer: {
        _id: lecturer._id,
        fullName: lecturer.fullName,
      },
      count: salaries.length,
      data: salaries,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get salary by ID
export const getSalaryById = async (req, res) => {
  try {
    const { id } = req.params;

    const salary = await Salary.findOne({
      _id: id,
      institute: req.user.institute,
    }).populate("lecturer", "fullName email lecturerProfile");

    if (!salary) {
      return res.status(404).json({ message: "Salary record not found" });
    }

    res.json({
      statusCode: 200,
      data: salary,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update salary record
export const updateSalary = async (req, res) => {
  try {
    // Only admin can update salary
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Only admins can update salary records" });
    }

    const { id } = req.params;
    const { salary, bonus, deduction, remarks, status } = req.body;

    const salaryRecord = await Salary.findOne({
      _id: id,
      institute: req.user.institute,
    });

    if (!salaryRecord) {
      return res.status(404).json({ message: "Salary record not found" });
    }

    // Only allow updates if status is pending
    if (salaryRecord.status !== "pending") {
      return res.status(400).json({ message: "Can only update pending salary records" });
    }

    if (salary !== undefined) salaryRecord.salary = salary;
    if (bonus !== undefined) salaryRecord.bonus = bonus;
    if (deduction !== undefined) salaryRecord.deduction = deduction;
    if (remarks !== undefined) salaryRecord.remarks = remarks;
    if (status) salaryRecord.status = status;

    await salaryRecord.save();

    res.json({
      message: "Salary record updated successfully",
      data: salaryRecord,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Mark salary as paid
export const markAsPaid = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Only admins can mark salary as paid" });
    }

    const { id } = req.params;

    const salary = await Salary.findOne({
      _id: id,
      institute: req.user.institute,
    });

    if (!salary) {
      return res.status(404).json({ message: "Salary record not found" });
    }

    salary.status = "paid";
    salary.paidDate = new Date();
    await salary.save();

    res.json({
      message: "Salary marked as paid",
      data: salary,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get salary summary for a month
export const getMonthlySalarySummary = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { salaryMonth } = req.params;

    if (!salaryMonth) {
      return res.status(400).json({ message: "salaryMonth is required (format: YYYY-MM)" });
    }

    const summary = await Salary.aggregate([
      {
        $match: {
          institute: new mongoose.Types.ObjectId(req.user.institute),
          salaryMonth,
        },
      },
      {
        $group: {
          _id: null,
          totalSalary: { $sum: "$salary" },
          totalBonus: { $sum: "$bonus" },
          totalDeduction: { $sum: "$deduction" },
          totalAmount: { $sum: "$totalAmount" },
          totalRecords: { $sum: 1 },
          paidCount: {
            $sum: { $cond: [{ $eq: ["$status", "paid"] }, 1, 0] },
          },
          pendingCount: {
            $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
          },
        },
      },
    ]);

    if (!summary.length) {
      return res.json({
        salaryMonth,
        totalSalary: 0,
        totalBonus: 0,
        totalDeduction: 0,
        totalAmount: 0,
        totalRecords: 0,
        paidCount: 0,
        pendingCount: 0,
      });
    }

    res.json({
      salaryMonth,
      ...summary[0],
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete salary record
export const deleteSalary = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Only admins can delete salary records" });
    }

    const { id } = req.params;

    const salary = await Salary.findOne({
      _id: id,
      institute: req.user.institute,
    });

    if (!salary) {
      return res.status(404).json({ message: "Salary record not found" });
    }

    // Only allow deletion if status is pending
    if (salary.status !== "pending") {
      return res.status(400).json({ message: "Can only delete pending salary records" });
    }

    await Salary.deleteOne({ _id: id });

    res.json({
      message: "Salary record deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
