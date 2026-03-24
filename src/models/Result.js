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
  },
  { timestamps: true }
);

resultSchema.index({ student: 1, subject: 1, class: 1 }, { unique: true });

export default mongoose.model("Result", resultSchema);
