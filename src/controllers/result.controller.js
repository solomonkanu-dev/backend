// controllers/resultController.js
import Result from "../models/Result.js";
import Subject from "../models/Subject.js";
import User from "../models/user.js";

export const assignMarks = async (req, res) => {
  try {
    if (!["admin", "lecturer"].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { studentId, subjectId, classId, marksObtained } = req.body;

    const instituteId = req.user.institute?._id || req.user.institute;

    const student = await User.findOne({
      _id: studentId,
      role: "student",
      institute: instituteId,
    });

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const subject = await Subject.findOne({
      _id: subjectId,
      class: classId,
      institute: instituteId,
    });

    if (!subject) {
      return res.status(404).json({ message: "Subject not found" });
    }

    if (marksObtained > subject.totalMarks) {
      return res
        .status(400)
        .json({ message: "Marks exceed total marks" });
    }

    const grade =
      marksObtained >= 70
        ? "A"
        : marksObtained >= 60
        ? "B"
        : marksObtained >= 50
        ? "C"
        : marksObtained >= 40
        ? "D"
        : "F";

    const result = await Result.findOneAndUpdate(
      {
        student: studentId,
        subject: subjectId,
        class: classId,
      },
      {
        marksObtained,
        grade,
        institute: instituteId,
      },
      { upsert: true, new: true }
    );

    res.status(200).json({
      statusCode: 200,
      message: "Marks assigned successfully",
      result,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
