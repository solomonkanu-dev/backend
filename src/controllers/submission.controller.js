import Submission from "../models/Submission.js";
import Assignment from "../models/Assignment.js";

export const submitAssignment = async (req, res) => {
  try {
    if (req.user.role !== "student") {
      return res.status(403).json({ message: "Only students can submit assignments" });
    }

    const { assignmentId, fileUrl } = req.body;

    if (!assignmentId || !fileUrl) {
      return res.status(400).json({ message: "Assignment and file required" });
    }

    const assignment = await Assignment.findOne({
      _id: assignmentId,
      institute: req.user.institute,
    });

    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    const exists = await Submission.findOne({
      assignment: assignmentId,
      student: req.user.id,
    });

    if (exists) {
      return res.status(409).json({ message: "Already submitted" });
    }

    const submission = await Submission.create({
      assignment: assignmentId,
      student: req.user.id,
      fileUrl,
    });

    res.status(201).json({
      message: "Assignment submitted successfully",
      submission,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export const gradeSubmission = async (req, res) => {
  try {
    if (req.user.role !== "lecturer") {
      return res.status(403).json({ message: "Only lecturers can grade" });
    }

    const { submissionId } = req.params;
    const { score } = req.body;

    const submission = await Submission.findById(submissionId)
      .populate("assignment");

    if (!submission) {
      return res.status(404).json({ message: "Submission not found" });
    }

    if (submission.assignment.lecturer.toString() !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    submission.score = score;
    await submission.save();

    res.json({ message: "Submission graded", submission });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getSubmissionsForAssignment = async (req, res) => {
  const { assignmentId } = req.params;

  const submissions = await Submission.find({ assignment: assignmentId })
    .populate("student", "fullName email");

  res.json(submissions);
};

export const getMySubmissions = async (req, res) => {
  const submissions = await Submission.find({ student: req.user.id })
    .populate("assignment", "title dueDate");

  res.json(submissions);
};
