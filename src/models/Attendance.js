// models/Attendance.js
import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
  {
    institute: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Institute",
      required: true,
    },
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      default: null,
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      default: null,
    },
    lecturer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    date: {
      type: Date,
      required: true,
    },
    type: {
      type: String,
      enum: ["student", "employee"],
      default: "student",
    },
    status: {
      type: String,
      enum: ["present", "absent", "leave"],
      default: "present",
    },
    records: [
      {
        student: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        status: {
          type: String,
          enum: ["present", "absent"],
          default: "present",
        },
      },
    ],
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // lecturer/admin
    },
  },
  { timestamps: true }
);

attendanceSchema.index({ class: 1, subject: 1, date: 1 });
attendanceSchema.index(
  { institute: 1, class: 1, subject: 1, date: 1, type: 1 },
  { unique: true, partialFilterExpression: { type: "student" } }
);

attendanceSchema.index(
  { institute: 1, lecturer: 1, date: 1, type: 1 },
  { unique: true, partialFilterExpression: { type: "lecturer" } }
);

export default mongoose.model("Attendance", attendanceSchema);
