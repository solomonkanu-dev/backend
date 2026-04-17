import mongoose from "mongoose";

const resultSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    subject: { type: mongoose.Schema.Types.ObjectId, ref: "Subject" },
    totalScore: Number,
    grade: String,
    institute: { type: mongoose.Schema.Types.ObjectId, ref: "Institute" },
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
    },
    marksObtained: {
      type: Number,
      required: true,
    },
    term: { type: mongoose.Schema.Types.ObjectId, ref: "AcademicTerm", default: null },
    isPublished: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Each student can have one result per subject per class per term
resultSchema.index({ student: 1, subject: 1, class: 1, term: 1 }, { unique: true });
resultSchema.index({ student: 1, class: 1 });

export default mongoose.model("Result", resultSchema);
