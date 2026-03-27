import User from "../models/user.js";
import Institute from "../models/Institute.js";
import { uploadToCloudinary } from "../config/cloudinary.js";

// ─── Profile Photo ────────────────────────────────────────────────────────────

export const uploadProfilePhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const result = await uploadToCloudinary(req.file.buffer, {
      folder: "profile_photos",
      transformation: [
        { width: 400, height: 400, crop: "fill", gravity: "face" },
        { quality: "auto", fetch_format: "auto" },
      ],
    });

    const userId = req.user._id;
    const user = await User.findByIdAndUpdate(
      userId,
      { profilePhoto: result.secure_url },
      { new: true, select: "-password" }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      message: "Profile photo uploaded successfully",
      profilePhoto: result.secure_url,
      user,
    });
  } catch (error) {
    res.status(500).json({ message: "Upload failed", error: error.message });
  }
};

export const getProfilePhoto = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("profilePhoto");

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ profilePhoto: user.profilePhoto || null });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── Institute Logo ───────────────────────────────────────────────────────────

export const uploadInstituteLogo = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Only admins can upload institute logos" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const instituteId = req.user.institute?._id || req.user.institute;
    if (!instituteId) {
      return res.status(400).json({ message: "No institute associated with your account" });
    }

    const result = await uploadToCloudinary(req.file.buffer, {
      folder: "institute_logos",
      transformation: [
        { width: 400, height: 400, crop: "limit" },
        { quality: "auto", fetch_format: "auto" },
      ],
    });

    const institute = await Institute.findByIdAndUpdate(
      instituteId,
      { logo: result.secure_url },
      { new: true }
    );

    if (!institute) {
      return res.status(404).json({ message: "Institute not found" });
    }

    res.json({
      message: "Institute logo uploaded successfully",
      logo: result.secure_url,
      institute,
    });
  } catch (error) {
    res.status(500).json({ message: "Upload failed", error: error.message });
  }
};

// ─── Assignment File ──────────────────────────────────────────────────────────

export const uploadAssignmentFile = async (req, res) => {
  try {
    if (req.user.role !== "student") {
      return res.status(403).json({ message: "Only students can upload assignment files" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const isPdf = req.file.mimetype === "application/pdf";
    const isDoc =
      req.file.mimetype === "application/msword" ||
      req.file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    const result = await uploadToCloudinary(req.file.buffer, {
      folder: "assignment_submissions",
      resource_type: isPdf || isDoc ? "raw" : "image",
      ...(!(isPdf || isDoc) && {
        transformation: [{ quality: "auto", fetch_format: "auto" }],
      }),
    });

    res.json({
      message: "File uploaded successfully",
      fileUrl: result.secure_url,
      publicId: result.public_id,
      resourceType: result.resource_type,
    });
  } catch (error) {
    res.status(500).json({ message: "Upload failed", error: error.message });
  }
};
