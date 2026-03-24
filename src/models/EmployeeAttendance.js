// models/Attendance.js
import mongoose from "mongoose";

const EmployeeAttendanceSchema = new mongoose.Schema(
  {
    institute: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Institute",
      required: true,
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
    records: [
      {
        lecturer: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        status: {
          type: String,
          enum: ["present", "absent", "leave"],
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

EmployeeAttendanceSchema.index(
  { institute: 1, lecturer: 1, date: 1 },
  { unique: true }
);


export default mongoose.model("EmployeeAttendance", EmployeeAttendanceSchema);
