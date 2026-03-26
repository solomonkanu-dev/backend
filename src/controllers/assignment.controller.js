import Assignment from "../models/Assignment.js";
import Subject from "../models/Subject.js";

export const createAssignment = async (req, res) => {
  try {
    if (req.user.role !== "lecturer" && req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { title, description, subjectId, dueDate, totalMarks, status } = req.body;

    // Verify subject belongs to this institute (and to this lecturer if role is lecturer)
    const subjectQuery = { _id: subjectId, institute: req.user.institute };
    if (req.user.role === "lecturer") subjectQuery.lecturer = req.user._id;

    const subject = await Subject.findOne(subjectQuery);
    if (!subject) {
      return res.status(404).json({ message: "Subject not found or unauthorized" });
    }

    const assignment = await Assignment.create({
      title,
      description,
      subject: subjectId,
      class: subject.class,
      lecturer: req.user._id,
      institute: req.user.institute,
      dueDate,
      totalMarks: totalMarks ?? 100,
      status: status ?? "draft",
    });

    res.status(201).json({ message: "Assignment created successfully", assignment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export const getAssignmentsBySubject = async (req, res) => {
  try {
    const { subjectId } = req.params;

    const query = { subject: subjectId, institute: req.user.institute };

    // Students only see published assignments
    if (req.user.role === "student") query.status = "published";

    const assignments = await Assignment.find(query)
      .populate("subject", "name code")
      .sort({ dueDate: 1 });

    res.json(assignments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export const getAssignmentsByClass = async (req, res) => {
  try {
    const { classId } = req.params;

    const query = { class: classId, institute: req.user.institute };

    // Students only see published assignments
    if (req.user.role === "student") query.status = "published";

    const assignments = await Assignment.find(query)
      .populate("subject", "name code")
      .populate("lecturer", "fullName")
      .sort({ dueDate: 1 });

    res.json(assignments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export const getMyAssignments = async (req, res) => {
  try {
    if (req.user.role !== "lecturer") {
      return res.status(403).json({ message: "Access denied" });
    }

    const assignments = await Assignment.find({
      lecturer: req.user._id,
      institute: req.user.institute,
    })
      .populate("subject", "name code")
      .populate("class", "name")
      .sort({ dueDate: 1 });

    res.json(assignments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export const getAssignmentById = async (req, res) => {
  try {
    const assignment = await Assignment.findOne({
      _id: req.params.id,
      institute: req.user.institute,
    })
      .populate("subject", "name code")
      .populate("class", "name")
      .populate("lecturer", "fullName");

    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    // Students only see published assignments
    if (req.user.role === "student" && assignment.status !== "published") {
      return res.status(404).json({ message: "Assignment not found" });
    }

    res.json(assignment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export const updateAssignment = async (req, res) => {
  try {
    if (req.user.role !== "lecturer" && req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const assignment = await Assignment.findOne({
      _id: req.params.id,
      institute: req.user.institute,
    });

    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    // Lecturers can only edit their own assignments
    if (req.user.role === "lecturer" && String(assignment.lecturer) !== String(req.user._id)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { title, description, dueDate, totalMarks, status } = req.body;
    if (title !== undefined) assignment.title = title;
    if (description !== undefined) assignment.description = description;
    if (dueDate !== undefined) assignment.dueDate = dueDate;
    if (totalMarks !== undefined) assignment.totalMarks = totalMarks;
    if (status !== undefined) assignment.status = status;

    await assignment.save();

    res.json({ message: "Assignment updated", assignment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export const deleteAssignment = async (req, res) => {
  try {
    if (req.user.role !== "lecturer" && req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const assignment = await Assignment.findOne({
      _id: req.params.id,
      institute: req.user.institute,
    });

    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    // Lecturers can only delete their own assignments
    if (req.user.role === "lecturer" && String(assignment.lecturer) !== String(req.user._id)) {
      return res.status(403).json({ message: "Access denied" });
    }

    await assignment.deleteOne();

    res.json({ message: "Assignment deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
