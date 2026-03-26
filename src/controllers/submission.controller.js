import Submission from "../models/Submission.js";
import Assignment from "../models/Assignment.js";

export const submitAssignment = async (req, res) => {
  try {
    if (req.user.role !== "student") {
      return res.status(403).json({ message: "Only students can submit assignments" });
    }

    const { assignmentId, fileUrl, content } = req.body;

    const assignment = await Assignment.findOne({
      _id: assignmentId,
      institute: req.user.institute,
      status: "published",
    });

    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    const exists = await Submission.findOne({
      assignment: assignmentId,
      student: req.user._id,
    });

    if (exists) {
      return res.status(409).json({ message: "Already submitted" });
    }

    const isLate = new Date() > new Date(assignment.dueDate);

    const submission = await Submission.create({
      assignment: assignmentId,
      student: req.user._id,
      fileUrl: fileUrl || "",
      content: content || "",
      isLate,
      status: "pending",
    });

    res.status(201).json({
      message: isLate ? "Assignment submitted (late)" : "Assignment submitted successfully",
      submission,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export const gradeSubmission = async (req, res) => {
  try {
    if (req.user.role !== "lecturer" && req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { submissionId } = req.params;
    // Accept either 'score' or 'marks' from the frontend
    const score = Number(req.body.score ?? req.body.marks);
    const { feedback } = req.body;

    const submission = await Submission.findById(submissionId).populate("assignment");

    if (!submission) {
      return res.status(404).json({ message: "Submission not found" });
    }

    // Scope check — must belong to same institute
    const instituteId = String(req.user.institute?._id || req.user.institute);
    if (String(submission.assignment.institute) !== instituteId) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Lecturers can only grade their own assignments
    if (
      req.user.role === "lecturer" &&
      String(submission.assignment.lecturer) !== String(req.user._id)
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Score must not exceed totalMarks
    const totalMarks = submission.assignment.totalMarks ?? 100;
    if (score > totalMarks) {
      return res.status(400).json({
        message: `Score cannot exceed total marks (${totalMarks})`,
      });
    }

    submission.score = score;
    if (feedback !== undefined) submission.feedback = feedback;
    submission.status = "graded";
    await submission.save();

    res.json({ message: "Submission graded", submission });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export const getSubmissionsForAssignment = async (req, res) => {
  try {
    if (req.user.role !== "lecturer" && req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { assignmentId } = req.params;

    const assignment = await Assignment.findOne({
      _id: assignmentId,
      institute: req.user.institute,
    });

    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    // Lecturers can only see submissions for their own assignments
    if (req.user.role === "lecturer" && String(assignment.lecturer) !== String(req.user._id)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const submissions = await Submission.find({ assignment: assignmentId })
      .populate("student", "fullName email studentProfile")
      .populate("assignment", "title totalMarks dueDate subject")
      .sort({ createdAt: 1 });

    res.json(submissions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export const getMySubmissions = async (req, res) => {
  try {
    if (req.user.role !== "student") {
      return res.status(403).json({ message: "Access denied" });
    }

    const submissions = await Submission.find({ student: req.user._id })
      .populate({
        path: "assignment",
        select: "title dueDate totalMarks status subject",
        populate: { path: "subject", select: "name code" },
      })
      .sort({ createdAt: -1 });

    res.json(submissions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
