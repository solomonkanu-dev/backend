import mongoose from "mongoose";

const academicTermSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ["term", "semester"], default: "term" },
  academicYear: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  isCurrent: { type: Boolean, default: false },
  institute: { type: mongoose.Schema.Types.ObjectId, ref: "Institute", required: true },
}, { timestamps: true });

academicTermSchema.index({ institute: 1, academicYear: 1, name: 1 }, { unique: true });

export default mongoose.model("AcademicTerm", academicTermSchema);
