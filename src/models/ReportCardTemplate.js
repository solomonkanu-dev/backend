import mongoose from "mongoose";

const reportCardTemplateSchema = new mongoose.Schema(
  {
    institute: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Institute",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },

    // Layout — "standard" portrait card or "traditional" landscape 3-domain card
    layout: {
      type: String,
      enum: ["standard", "traditional"],
      default: "standard",
    },

    // Colours
    primaryColor: { type: String, default: "#3c50e0" },
    headerTextColor: { type: String, default: "#ffffff" },
    stripeColor: { type: String, default: "#f8fafc" },
    cardBg: { type: String, default: "#ffffff" },

    // Text
    reportTitle: { type: String, default: "Report Card", trim: true },
    footerNote: { type: String, default: "", trim: true },
    signatureLabels: {
      type: [String],
      default: ["Class Teacher", "Head of Academics", "Principal / Director"],
    },

    // Section toggles
    showSchoolHeader: { type: Boolean, default: true },
    showPhoto: { type: Boolean, default: true },
    showAttendance: { type: Boolean, default: true },
    showPosition: { type: Boolean, default: true },
    showTermBreakdown: { type: Boolean, default: true },

    // Typography
    fontFamily: { type: String, default: "Arial, sans-serif" },

    // Brand assets (Cloudinary URLs)
    letterheadImage: { type: String, default: "" },
    watermarkImage: { type: String, default: "" },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

reportCardTemplateSchema.index({ institute: 1, name: 1 }, { unique: true });
reportCardTemplateSchema.index({ institute: 1, isDefault: 1 });

export default mongoose.model("ReportCardTemplate", reportCardTemplateSchema);
