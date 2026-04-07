import mongoose from "mongoose";

const timetableEntrySchema = new mongoose.Schema(
  {
    day: {
      type: String,
      enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      required: true,
    },
    startTime: { type: String, required: true }, // "08:00"
    endTime: { type: String, required: true },   // "09:00"
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },
    lecturer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { _id: false }
);

const timetableSchema = new mongoose.Schema(
  {
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
    },
    institute: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Institute",
      required: true,
    },
    entries: [timetableEntrySchema],
  },
  { timestamps: true }
);

// One timetable per class per institute
timetableSchema.index({ class: 1, institute: 1 }, { unique: true });

export default mongoose.model("Timetable", timetableSchema);
