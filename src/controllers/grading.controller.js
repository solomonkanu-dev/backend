import GradingScale from "../models/GradingScale.js";
import mongoose from "mongoose";

const isDev = process.env.NODE_ENV === "development";

/**
 * POST /api/v1/grading
 * Create a grading scale for the institute
 */
export const createGradingScale = async (req, res) => {
  try {
    const { name, grades, isDefault } = req.body;
    const instituteId = req.user.institute?._id || req.user.institute;

    if (!name || !Array.isArray(grades) || grades.length === 0) {
      return res.status(400).json({ success: false, message: "Name and at least one grade entry are required" });
    }

    // Validate grade entries
    for (const entry of grades) {
      if (entry.minScore > entry.maxScore) {
        return res.status(400).json({
          success: false,
          message: `Invalid range for grade "${entry.grade}": minScore cannot exceed maxScore`,
        });
      }
    }

    // If this scale is set as default, unset the current default
    if (isDefault) {
      await GradingScale.updateMany({ institute: instituteId }, { isDefault: false });
    }

    const scale = await GradingScale.create({
      institute: instituteId,
      name,
      grades,
      isDefault: isDefault || false,
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, data: scale });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: "A grading scale with this name already exists" });
    }
    res.status(500).json({ success: false, message: isDev ? error.message : "Internal server error" });
  }
};

/**
 * GET /api/v1/grading
 * Get all grading scales for the institute
 */
export const getGradingScales = async (req, res) => {
  try {
    const instituteId = req.user.institute?._id || req.user.institute;

    const scales = await GradingScale.find({ institute: instituteId })
      .populate("createdBy", "fullName email")
      .sort({ isDefault: -1, createdAt: -1 });

    res.json({ success: true, data: scales });
  } catch (error) {
    res.status(500).json({ success: false, message: isDev ? error.message : "Internal server error" });
  }
};

/**
 * GET /api/v1/grading/default
 * Get the default grading scale for the institute
 */
export const getDefaultGradingScale = async (req, res) => {
  try {
    const instituteId = req.user.institute?._id || req.user.institute;

    const scale = await GradingScale.findOne({ institute: instituteId, isDefault: true });

    if (!scale) {
      return res.status(404).json({ success: false, message: "No default grading scale set" });
    }

    res.json({ success: true, data: scale });
  } catch (error) {
    res.status(500).json({ success: false, message: isDev ? error.message : "Internal server error" });
  }
};

/**
 * GET /api/v1/grading/:id
 * Get a single grading scale by ID
 */
export const getGradingScaleById = async (req, res) => {
  try {
    const { id } = req.params;
    const instituteId = req.user.institute?._id || req.user.institute;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid grading scale ID" });
    }

    const scale = await GradingScale.findOne({ _id: id, institute: instituteId })
      .populate("createdBy", "fullName email");

    if (!scale) {
      return res.status(404).json({ success: false, message: "Grading scale not found" });
    }

    res.json({ success: true, data: scale });
  } catch (error) {
    res.status(500).json({ success: false, message: isDev ? error.message : "Internal server error" });
  }
};

/**
 * PUT /api/v1/grading/:id
 * Update a grading scale
 */
export const updateGradingScale = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, grades, isDefault } = req.body;
    const instituteId = req.user.institute?._id || req.user.institute;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid grading scale ID" });
    }

    const scale = await GradingScale.findOne({ _id: id, institute: instituteId });

    if (!scale) {
      return res.status(404).json({ success: false, message: "Grading scale not found" });
    }

    if (grades) {
      for (const entry of grades) {
        if (entry.minScore > entry.maxScore) {
          return res.status(400).json({
            success: false,
            message: `Invalid range for grade "${entry.grade}": minScore cannot exceed maxScore`,
          });
        }
      }
      scale.grades = grades;
    }

    if (name) scale.name = name;

    // If setting as default, unset others first
    if (isDefault === true) {
      await GradingScale.updateMany(
        { institute: instituteId, _id: { $ne: id } },
        { isDefault: false }
      );
      scale.isDefault = true;
    } else if (isDefault === false) {
      scale.isDefault = false;
    }

    await scale.save();

    res.json({ success: true, data: scale });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: "A grading scale with this name already exists" });
    }
    res.status(500).json({ success: false, message: isDev ? error.message : "Internal server error" });
  }
};

/**
 * PATCH /api/v1/grading/:id/set-default
 * Set a grading scale as the default for the institute
 */
export const setDefaultGradingScale = async (req, res) => {
  try {
    const { id } = req.params;
    const instituteId = req.user.institute?._id || req.user.institute;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid grading scale ID" });
    }

    const scale = await GradingScale.findOne({ _id: id, institute: instituteId });

    if (!scale) {
      return res.status(404).json({ success: false, message: "Grading scale not found" });
    }

    // Unset all, then set the chosen one
    await GradingScale.updateMany({ institute: instituteId }, { isDefault: false });
    scale.isDefault = true;
    await scale.save();

    res.json({ success: true, message: `"${scale.name}" is now the default grading scale` });
  } catch (error) {
    res.status(500).json({ success: false, message: isDev ? error.message : "Internal server error" });
  }
};

/**
 * DELETE /api/v1/grading/:id
 * Delete a grading scale
 */
export const deleteGradingScale = async (req, res) => {
  try {
    const { id } = req.params;
    const instituteId = req.user.institute?._id || req.user.institute;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid grading scale ID" });
    }

    const scale = await GradingScale.findOne({ _id: id, institute: instituteId });

    if (!scale) {
      return res.status(404).json({ success: false, message: "Grading scale not found" });
    }

    if (scale.isDefault) {
      return res.status(400).json({ success: false, message: "Cannot delete the default grading scale. Set another as default first." });
    }

    await scale.deleteOne();

    res.json({ success: true, message: "Grading scale deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: isDev ? error.message : "Internal server error" });
  }
};

/**
 * Utility: resolve a grade from a score using the institute's default scale.
 * Falls back to the built-in scale if none is configured.
 */
export const resolveGrade = async (instituteId, score) => {
  const scale = await GradingScale.findOne({ institute: instituteId, isDefault: true });

  if (scale) {
    const entry = scale.grades.find((g) => score >= g.minScore && score <= g.maxScore);
    return entry ? entry.grade : "F";
  }

  // Built-in fallback
  if (score >= 70) return "A";
  if (score >= 60) return "B";
  if (score >= 50) return "C";
  if (score >= 40) return "D";
  return "F";
};
