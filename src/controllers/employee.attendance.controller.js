import EmployeeAttendance from "../models/EmployeeAttendance.js";
import User from "../models/user.js";
import mongoose from "mongoose";

export const markEmployeeAttendance = async (req, res) => {
  try {
    // Only admin and super_admin can mark employee attendance
    if (!["admin", "super_admin"].includes(req.user.role)) {
      return res.status(403).json({ message: "Only admins can mark employee attendance" });
    }

    const { date, records } = req.body;

    if (!date || !records?.length) {
      return res.status(400).json({ message: "date and records are required" });
    }

    const attendanceDate = new Date(date);

    // Validate that all employee IDs exist and are lecturers or admins
    const employeeIds = records.map((r) => r.lecturerId);
    const employees = await User.find({
      _id: { $in: employeeIds },
      role: { $in: ["lecturer", "admin"] },
      institute: req.user.institute,
    });

    if (employees.length !== employeeIds.length) {
      return res.status(404).json({ message: "One or more employees not found" });
    }

    // Check for duplicates in the records
    const uniqueIds = new Set(employeeIds);
    if (uniqueIds.size !== employeeIds.length) {
      return res.status(400).json({ message: "Duplicate employee IDs in records" });
    }

    // Create attendance records for each employee
    const attendanceRecords = await Promise.all(
      records.map((record) =>
        EmployeeAttendance.create({
          institute: req.user.institute,
          lecturer: record.lecturerId,
          date: attendanceDate,
          records: [
            {
              lecturer: record.lecturerId,
              status: record.status,
            },
          ],
          markedBy: req.user.id,
        })
      )
    );

    res.status(201).json({
      statusCode: 201,
      message: "Employee attendance recorded successfully",
      count: attendanceRecords.length,
      data: attendanceRecords,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getEmployeeAttendance = async (req, res) => {
  try {
    const { lecturerId, from, to } = req.query;

    if (!lecturerId) {
      return res.status(400).json({ message: "lecturerId is required" });
    }

    const match = {
      lecturer: new mongoose.Types.ObjectId(lecturerId),
      institute: new mongoose.Types.ObjectId(req.user.institute),
    };

    if (from || to) {
      match.date = {};
      if (from) match.date.$gte = new Date(from);
      if (to) match.date.$lte = new Date(to);
    }

    const attendances = await EmployeeAttendance.find(match)
      .populate("lecturer", "fullName email")
      .sort({ date: -1 })
      .lean();

    res.json({
      count: attendances.length,
      attendances,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getEmployeeAttendanceSummary = async (req, res) => {
  try {
    const { lecturerId } = req.params;

    if (!lecturerId) {
      return res.status(400).json({ message: "lecturerId is required" });
    }

    const lecturerObjectId = new mongoose.Types.ObjectId(lecturerId);
    const instituteObjectId = new mongoose.Types.ObjectId(req.user.institute);

    const summary = await EmployeeAttendance.aggregate([
      {
        $match: {
          lecturer: lecturerObjectId,
          institute: instituteObjectId,
        },
      },
      { $unwind: "$records" },
      {
        $group: {
          _id: null,
          totalDays: { $sum: 1 },
          present: { $sum: { $cond: [{ $eq: ["$records.status", "present"] }, 1, 0] } },
          absent: { $sum: { $cond: [{ $eq: ["$records.status", "absent"] }, 1, 0] } },
          leave: { $sum: { $cond: [{ $eq: ["$records.status", "leave"] }, 1, 0] } },
        },
      },
      {
        $project: {
          totalDays: 1,
          present: 1,
          absent: 1,
          leave: 1,
          percentage: {
            $cond: [
              { $eq: ["$totalDays", 0] },
              0,
              { $round: [{ $multiply: [{ $divide: ["$present", "$totalDays"] }, 100] }, 2] },
            ],
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "lecturer",
          foreignField: "_id",
          as: "lecturer",
        },
      },
      { $unwind: { path: "$lecturer", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          lecturer: {
            _id: "$lecturer._id",
            fullName: "$lecturer.fullName",
          },
          totalDays: 1,
          present: 1,
          absent: 1,
          leave: 1,
          percentage: 1,
        },
      },
    ]);

    if (!summary.length) {
      return res.json({
        lecturer: { _id: lecturerId },
        totalDays: 0,
        present: 0,
        absent: 0,
        leave: 0,
        percentage: 0,
      });
    }

    res.json(summary[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};