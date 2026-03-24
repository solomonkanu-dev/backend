import FeeStructure from "../models/FeeStructure.js";
import Class from "../models/Class.js";
import User from "../models/user.js";
import mongoose from "mongoose";

const computeTotal = (particulars = []) =>
  particulars.reduce((s, p) => s + (Number(p.amount) || 0), 0);

export const createFeeStructure = async (req, res) => {
  try {
    const { category, classId, studentId, particulars, instituteId } = req.body;

    if (!["all", "class", "student"].includes(category)) {
      return res.status(400).json({ success: false, message: "Invalid category" });
    }

    if (category === "class" && !classId) {
      return res.status(400).json({ success: false, message: "classId is required for class category" });
    }

    if (category === "student" && !studentId) {
      return res.status(400).json({ success: false, message: "studentId is required for student category" });
    }

    if (!Array.isArray(particulars) || particulars.length === 0) {
      return res.status(400).json({ success: false, message: "particulars are required" });
    }

    // verify relations when provided
    if (classId && !mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({ success: false, message: "Invalid classId" });
    }

    if (studentId && !mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ success: false, message: "Invalid studentId" });
    }

    if (classId) {
      const cls = await Class.findById(classId);
      if (!cls) return res.status(404).json({ success: false, message: "Class not found" });
    }

    if (studentId) {
      const student = await User.findById(studentId);
      if (!student) return res.status(404).json({ success: false, message: "Student not found" });
    }

    // sanitize particulars
    const cleaned = particulars.map((p) => ({ label: String(p.label || "").trim(), amount: Number(p.amount || 0) }));
    const totalAmount = computeTotal(cleaned);

    const created = await FeeStructure.create({
      category,
      classId: classId || undefined,
      studentId: studentId || undefined,
      particulars: cleaned,
      totalAmount,
      createdBy: req.user?._id,
      instituteId: instituteId || req.user?.institute?._id || req.user?.institute,
    });

    res.status(201).json({ success: true, data: created });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getFeeStructures = async (req, res) => {
  try {
    const { category, classId, studentId, instituteId, page = 1, limit = 20 } = req.query;
    const q = {};
    if (category) q.category = category;
    if (classId) q.classId = classId;
    if (studentId) q.studentId = studentId;
    if (instituteId) q.instituteId = instituteId;
    else if (req.user?.institute) q.instituteId = req.user.institute;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const lim = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));

    const [items, total] = await Promise.all([
      FeeStructure.find(q).skip((pageNum - 1) * lim).limit(lim).sort({ createdAt: -1 }),
      FeeStructure.countDocuments(q),
    ]);

    res.json({ success: true, data: items, meta: { page: pageNum, limit: lim, total } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getFeeStructureById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: "Invalid id" });

    const item = await FeeStructure.findById(id);
    if (!item) return res.status(404).json({ success: false, message: "Not found" });

    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateFeeStructure = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: "Invalid id" });

    const existing = await FeeStructure.findById(id);
    if (!existing) return res.status(404).json({ success: false, message: "Not found" });

    const { category, classId, studentId, particulars, instituteId } = req.body;

    if (category && !["all", "class", "student"].includes(category)) {
      return res.status(400).json({ success: false, message: "Invalid category" });
    }

    if (category === "class" && !classId && !existing.classId) {
      return res.status(400).json({ success: false, message: "classId is required for class category" });
    }

    if (category === "student" && !studentId && !existing.studentId) {
      return res.status(400).json({ success: false, message: "studentId is required for student category" });
    }

    if (classId && !mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({ success: false, message: "Invalid classId" });
    }

    if (studentId && !mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ success: false, message: "Invalid studentId" });
    }

    // apply updates
    if (category) existing.category = category;
    if (classId) existing.classId = classId;
    if (studentId) existing.studentId = studentId;
    if (instituteId) existing.instituteId = instituteId;

    if (particulars) {
      if (!Array.isArray(particulars) || particulars.length === 0) {
        return res.status(400).json({ success: false, message: "particulars are required" });
      }
      const cleaned = particulars.map((p) => ({ label: String(p.label || "").trim(), amount: Number(p.amount || 0) }));
      existing.particulars = cleaned;
      existing.totalAmount = computeTotal(cleaned);
    } else {
      // ensure totalAmount exists
      existing.totalAmount = existing.totalAmount || computeTotal(existing.particulars || []);
    }

    await existing.save();
    res.json({ success: true, data: existing });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteFeeStructure = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: "Invalid id" });

    const deleted = await FeeStructure.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ success: false, message: "Not found" });

    res.json({ success: true, data: deleted, message: "Deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export default {
  createFeeStructure,
  getFeeStructures,
  getFeeStructureById,
  updateFeeStructure,
  deleteFeeStructure,
};
