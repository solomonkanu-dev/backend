import Attendance from "../models/Attendance.js";
import Subject from "../models/Subject.js";
import Class from "../models/Class.js";
import User from "../models/user.js";
import mongoose from "mongoose";

export const markAttendance = async (req, res) => {
  try {
    if (req.user.role !== "lecturer" && req.user.role !== "admin") {
      return res.status(403).json({ message: "Only admins and lecturers can mark attendance" });
    }

    const { subjectId, classId, date, records } = req.body;

    if ((!subjectId && !classId) || !date || !records?.length) {
      return res.status(400).json({ message: "Invalid payload" });
    }

    // Determine class from provided subjectId or classId
    let classRef = classId;

    if (subjectId) {
      const subject = await Subject.findOne({
        _id: subjectId,
        lecturer: req.user.id,
        institute: req.user.institute,
      });

      if (!subject) {
        return res.status(404).json({ message: "Subject not found or unauthorized" });
      }

      classRef = subject.class;
    }


    const attendanceDate = new Date(date);

    const existing = await Attendance.findOne({
      class: classRef,
      date: attendanceDate,
      institute: req.user.institute,
    });

    if (existing) {
      return res.status(409).json({ message: "Attendance already marked for this date" });
    }

    const attendanceDoc = await Attendance.create({
      class: classRef,
      institute: req.user.institute,
      date: attendanceDate,
      records: records.map((r) => ({ student: r.studentId, status: r.status })),
      markedBy: req.user.id,
    });

    res.status(201).json({ message: "Attendance recorded successfully", data: attendanceDoc });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMyAttendance = async (req, res) => {
  if (req.user.role !== "student") {
    return res.status(403).json({ message: "Access denied" });
  }

  const attendances = await Attendance.find({ "records.student": req.user.id })
    .populate("class", "name")
    .sort({ date: -1 })
    .lean();

  // Return only the student's record for each attendance entry
  const result = attendances.map((a) => {
    const rec = (a.records || []).find((r) => String(r.student) === String(req.user.id));
    return {
      _id: a._id,
      class: a.class,
      date: a.date,
      status: rec ? rec.status : null,
    };
  });

  res.json(result);
};


export const attendanceSummary = async (req, res) => {
  const { studentId } = req.params;

  const total = await Attendance.countDocuments({
    "records.student": studentId,
  });

  const present = await Attendance.countDocuments({
    records: { $elemMatch: { student: studentId, status: "present" } },
  });
  const absent = await Attendance.countDocuments({
    records: { $elemMatch: { student: studentId, status: "absent" } },
  });

  const percentage = total === 0 ? 0 : ((present / total) * 100).toFixed(2);

  res.json({ total, present, absent, percentage });
};



export const getSubjectAttendance = async (req, res) => {
  // Support both subjectId (legacy) and classId
  const { subjectId, classId, date } = req.query;

  let classRef = classId;

  if (subjectId) {
    const subject = await Subject.findOne({ _id: subjectId, institute: req.user.institute });
    if (!subject) return res.status(404).json({ message: "Subject not found" });
    classRef = subject.class;
  }

  if (!classRef) return res.status(400).json({ message: "classId or subjectId required" });

  const attendance = await Attendance.find({
    class: classRef,
    ...(date && { date: new Date(date) }),
    institute: req.user.institute,
  }).populate("records.student", "fullName");

  res.json(attendance);
};


export const getMyAttendanceSummary = async (req, res) => {
  if (req.user.role !== "student") {
    return res.status(403).json({ message: "Access denied" });
  }
  const summary = await Attendance.aggregate([
    { $unwind: "$records" },
    { $match: { "records.student": mongoose.Types.ObjectId(req.user._id) } },
    {
      $group: {
        _id: "$class",
        totalClasses: { $sum: 1 },
        present: {
          $sum: { $cond: [{ $eq: ["$records.status", "present"] }, 1, 0] },
        },
        absent: {
          $sum: { $cond: [{ $eq: ["$records.status", "absent"] }, 1, 0] },
        },
      },
    },
    {
      $project: {
        totalClasses: 1,
        present: 1,
        absent: 1,
        percentage: { $cond: [{ $eq: ["$totalClasses", 0] }, 0, { $round: [{ $multiply: [{ $divide: ["$present", "$totalClasses"] }, 100] }, 2] }] },
      },
    },
    {
      $lookup: {
        from: "classes",
        localField: "_id",
        foreignField: "_id",
        as: "class",
      },
    },
    { $unwind: "$class" },
    {
      $project: {
        class: { name: "$class.name" },
        totalClasses: 1,
        present: 1,
        absent: 1,
        percentage: 1,
      },
    },
  ]);

  res.json(summary);
};


export const checkExamEligibility = async (req, res) => {
  // Accept either subjectId (legacy) or classId
  const { subjectId, classId } = req.params;

  if (req.user.role !== "student") {
    return res.status(403).json({ message: "Access denied" });
  }

  let classRef = classId;

  if (subjectId) {
    const subject = await Subject.findOne({ _id: subjectId, institute: req.user.institute });
    if (!subject) return res.json({ eligible: false, percentage: 0 });
    classRef = subject.class;
  }

  if (!classRef) return res.status(400).json({ message: "classId or subjectId required" });

  const stats = await Attendance.aggregate([
    { $unwind: "$records" },
    { $match: { "records.student": mongoose.Types.ObjectId(req.user._id), class: mongoose.Types.ObjectId(classRef) } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        present: { $sum: { $cond: [{ $eq: ["$records.status", "present"] }, 1, 0] } },
      },
    },
  ]);

  if (!stats.length) {
    return res.json({ eligible: false, percentage: 0 });
  }

  const percentage = (stats[0].present / stats[0].total) * 100;

  res.json({ percentage: Number(percentage.toFixed(2)), eligible: percentage >= 75 });
};


export const attendanceAnalytics = async (req, res) => {
  // Accept subjectId (legacy) or classId
  const { classId } = req.params;

  let classRef = classId;

  // if (subjectId) {
  //   const subject = await Subject.findOne({ _id: subjectId, institute: req.user.institute });
  //   if (!subject) return res.status(404).json({ message: "Subject not found" });
  //   classRef = subject.class;
  // }

  // if (!classRef) return res.status(400).json({ message: "classId or subjectId required" });

  const data = await Attendance.aggregate([
    { $unwind: "$records" },
    { $match: { class: mongoose.Types.ObjectId(classRef), institute: mongoose.Types.ObjectId(req.user.institute) } },
    {
      $group: {
        _id: "$date",
        present: { $sum: { $cond: [{ $eq: ["$records.status", "present"] }, 1, 0] } },
        absent: { $sum: { $cond: [{ $eq: ["$records.status", "absent"] }, 1, 0] } },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  res.json(data);
};


export const getClassWiseReport = async (req, res) => {
  try {
    const { classId, from, to } = req.query;

    if (!classId) return res.status(400).json({ message: "classId is required" });

    const classDoc = await Class.findOne({ _id: classId, institute: req.user.institute });
    if (!classDoc) return res.status(404).json({ message: "Class not found" });

    // Only admins or the class lecturer can view the full class report
    if (req.user.role === "lecturer" && String(classDoc.lecturer) !== String(req.user._id)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const match = {
      class: mongoose.Types.ObjectId(classId),
      institute: mongoose.Types.ObjectId(req.user.institute),
    };

    if (from || to) {
      match.date = {};
      if (from) match.date.$gte = new Date(from);
      if (to) match.date.$lte = new Date(to);
    }

    const report = await Attendance.aggregate([
      { $unwind: "$records" },
      { $match: match },
      {
        $group: {
          _id: "$records.student",
          totalClasses: { $sum: 1 },
          present: { $sum: { $cond: [{ $eq: ["$records.status", "present"] }, 1, 0] } },
          absent: { $sum: { $cond: [{ $eq: ["$records.status", "absent"] }, 1, 0] } },
        },
      },
      {
        $project: {
          totalClasses: 1,
          present: 1,
          absent: 1,
          percentage: {
            $cond: [
              { $eq: ["$totalClasses", 0] },
              0,
              { $round: [{ $multiply: [{ $divide: ["$present", "$totalClasses"] }, 100] }, 2] }
            ],
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "student",
        },
      },
      { $unwind: { path: "$student", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          student: {
            _id: "$student._id",
            fullName: "$student.fullName",
            registrationNumber: "$student.studentProfile.registrationNumber",
          },
          totalClasses: 1,
          present: 1,
          absent: 1,
          percentage: 1,
        },
      },
      { $sort: { "student.fullName": 1 } },
    ]);

    res.json({ class: { _id: classDoc._id, name: classDoc.name }, report });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const markEmployeeAttendance  = async (req, res) => {
  try {
    // 🔐 Role check
    if (!["admin", "super_admin"].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { date, records } = req.body;

    if (!date || !records?.length) {
      return res.status(400).json({
        message: "Date and attendance records are required",
      });
    }

    const instituteId = req.user.institute?._id || req.user.institute;
    const adminId = req.user._id;

    // 🧾 Prepare documents
    const attendanceDocs = records.map((rec) => {
      if (!rec.lecturerId || !rec.status) {
        throw new Error("Invalid lecturer attendance data");
      }

      return {
        institute: instituteId,
        lecturer: rec.lecturerId,
        markedBy: adminId,
        date: new Date(date),
        status: rec.status,
      };
    });

    // 🧨 Insert many (skip duplicates)
    await Attendance.insertMany(attendanceDocs, {
      ordered: false,
    });

    res.status(201).json({
      statusCode: 201,
      message: "Lecturer attendance marked successfully",
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message:
          "Attendance already marked for one or more lecturers on this date",
      });
    }

    res.status(500).json({ message: error.message });
  }
};



// export const markEmployeeAttendance = async (req, res) => {
//   try {
//     // Only admin can mark employee attendance
//     if (req.user.role !== "admin") {
//       return res.status(403).json({ message: "Only admins can mark employee attendance" });
//     }

//     const { date, records } = req.body;

//     if (!date || !records?.length) {
//       return res.status(400).json({ message: "date and records are required" });
//     }

//     const attendanceDate = new Date(date);

//     // Validate that all employee IDs exist and are lecturers or staff
//     const employeeIds = records.map((r) => r.lecturerId);
//     const employees = await User.find({
//       _id: { $in: employeeIds },
//       role: { $in: ["lecturer", "admin"] },
//       institute: req.user.institute,
//     });

//     if (employees.length !== employeeIds.length) {
//       return res.status(404).json({ message: "One or more employees not found" });
//     }

//     // Check for duplicates in the records
//     const uniqueIds = new Set(employeeIds);
//     if (uniqueIds.size !== employeeIds.length) {
//       return res.status(400).json({ message: "Duplicate employee IDs in records" });
//     }

//     // Create a separate attendance record for each employee
//     const attendanceRecords = await Promise.all(
//       records.map((record) =>
//         Attendance.create({
//           employee: record.lecturerId,
//           date: attendanceDate,
//           institute: req.user.institute,
//           status: record.status,
//           markedBy: req.user.id,
//           type: "employee", // Tag to distinguish from student attendance
//         })
//       )
//     );

//     res.status(201).json({
//       message: "Employee attendance recorded successfully",
//       count: attendanceRecords.length,
//       data: attendanceRecords,
//     });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };


export const getEmployeeAttendance = async (req, res) => {
  try {
    const { employeeId, from, to } = req.query;

    if (!employeeId) {
      return res.status(400).json({ message: "employeeId is required" });
    }

    const match = {
      employee: mongoose.Types.ObjectId(employeeId),
      institute: mongoose.Types.ObjectId(req.user.institute),
      type: "employee",
    };

    if (from || to) {
      match.date = {};
      if (from) match.date.$gte = new Date(from);
      if (to) match.date.$lte = new Date(to);
    }

    const attendances = await Attendance.find(match)
      .sort({ date: -1 })
      .lean();

    res.json({
      employee: { _id: employeeId },
      count: attendances.length,
      attendances,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export const getEmployeeAttendanceSummary = async (req, res) => {
  try {
    const { employeeId } = req.params;

    const summary = await Attendance.aggregate([
      {
        $match: {
          employee: mongoose.Types.ObjectId(employeeId),
          institute: mongoose.Types.ObjectId(req.user.institute),
          type: "employee",
        },
      },
      {
        $group: {
          _id: null,
          totalDays: { $sum: 1 },
          present: { $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] } },
          absent: { $sum: { $cond: [{ $eq: ["$status", "absent"] }, 1, 0] } },
          leave: { $sum: { $cond: [{ $eq: ["$status", "leave"] }, 1, 0] } },
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
          let: { empId: mongoose.Types.ObjectId(employeeId) },
          pipeline: [{ $match: { $expr: { $eq: ["$_id", mongoose.Types.ObjectId(employeeId)] } } }],
          as: "employee",
        },
      },
      { $unwind: { path: "$employee", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          employee: {
            _id: "$employee._id",
            fullName: "$employee.fullName",
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
        employee: { _id: employeeId },
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

