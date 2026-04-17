import mongoose from "mongoose";

const { Schema } = mongoose;

const dailyEntrySchema = new Schema(
  {
    date:        { type: Date, required: true },   // midnight UTC of this day
    dayOfWeek:   { type: Number, required: true }, // 0 = Sun … 6 = Sat
    peakCounts: {
      student:  { type: Number, default: 0 },
      lecturer: { type: Number, default: 0 },
      parent:   { type: Number, default: 0 },
      admin:    { type: Number, default: 0 },
    },
    peakTotal:      { type: Number, default: 0 },  // highest single-snapshot total
    avgTotal:       { type: Number, default: 0 },  // rolling average across snapshots
    snapshotsTaken: { type: Number, default: 0 },
    _runningSum:    { type: Number, default: 0 },  // internal accumulator, excluded from API responses
  },
  { _id: false }
);

const onlineUserReportSchema = new Schema(
  {
    weekStart:  { type: Date, required: true, unique: true }, // Monday 00:00:00.000 UTC
    weekEnd:    { type: Date, required: true },               // Sunday 23:59:59.999 UTC
    days:       { type: [dailyEntrySchema], default: [] },
    isComplete: { type: Boolean, default: false },
  },
  { timestamps: true }
);

onlineUserReportSchema.index({ weekStart: -1 });

export default mongoose.model("OnlineUserReport", onlineUserReportSchema);
