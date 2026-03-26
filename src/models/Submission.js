import mongoose from "mongoose";

const submissionSchema = new mongoose.Schema(
  {
    assignment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assignment",
      required: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    fileUrl: {
      type: String,
      default: "",
    },
    score: {
      type: Number,
      default: null,
    },
    feedback: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["pending", "graded"],
      default: "pending",
    },
    isLate: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// One submission per student per assignment
submissionSchema.index({ assignment: 1, student: 1 }, { unique: true });

export default mongoose.model("Submission", submissionSchema);
