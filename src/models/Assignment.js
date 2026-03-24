import mongoose from "mongoose";

const assignmentSchema = new mongoose.Schema(
  {
    title: String,
    subject: { type: mongoose.Schema.Types.ObjectId, ref: "Subject" },
    lecturer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    institute: { type: mongoose.Schema.Types.ObjectId, ref: "Institute" },
    dueDate: Date,
  },
  { timestamps: true }
);
export default mongoose.model("Assignment", assignmentSchema);