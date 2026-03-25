import mongoose from "mongoose";

const gradeEntrySchema = new mongoose.Schema(
  {
    grade: { type: String, required: true, trim: true },    // e.g. "A", "B+"
    minScore: { type: Number, required: true, min: 0 },
    maxScore: { type: Number, required: true, min: 0 },
    remark: { type: String, trim: true, default: "" },      // e.g. "Excellent", "Pass"
  },
  { _id: false }
);

const gradingScaleSchema = new mongoose.Schema(
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
    grades: {
      type: [gradeEntrySchema],
      validate: [(v) => Array.isArray(v) && v.length > 0, "At least one grade entry is required"],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

gradingScaleSchema.index({ institute: 1, name: 1 }, { unique: true });
gradingScaleSchema.index({ institute: 1, isDefault: 1 });

export default mongoose.model("GradingScale", gradingScaleSchema);
