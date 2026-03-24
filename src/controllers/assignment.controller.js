import Assignment from "../models/Assignment.js";
import Subject from "../models/Subject.js";

export const createAssignment = async (req, res) => {
  try {
    if (req.user.role !== "lecturer") {
      return res.status(403).json({ message: "Only lecturers can create assignments" });
    }

    const { title, description, subjectId, dueDate } = req.body;

    if (!title || !subjectId || !dueDate) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const subject = await Subject.findOne({
      _id: subjectId,
      lecturer: req.user.id,
      institute: req.user.institute,
    });

    if (!subject) {
      return res.status(404).json({ message: "Subject not found or unauthorized" });
    }

    const assignment = await Assignment.create({
      title,
      description,
      subject: subjectId,
      lecturer: req.user.id,
      institute: req.user.institute,
      dueDate,
    });

    res.status(201).json({
      message: "Assignment created successfully",
      assignment,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export const getAssignmentsBySubject = async (req, res) => {
  const { subjectId } = req.params;

  const assignments = await Assignment.find({
    subject: subjectId,
    institute: req.user.institute,
  }).sort({ dueDate: 1 });

  res.json(assignments);
};
