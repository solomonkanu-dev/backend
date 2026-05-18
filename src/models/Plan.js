import mongoose from 'mongoose';

const planSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      // 'standard' is the current paid plan; 'basic'/'pro' are legacy/retired
      // but kept in the enum so existing documents stay valid.
      enum: ['free', 'standard', 'basic', 'pro'],
      unique: true,
      required: true,
    },
    displayName: {
      type: String,
    },
    limits: {
      maxStudents:  { type: Number, default: 50 },
      maxLecturers: { type: Number, default: 5 },
      maxClasses:   { type: Number, default: 3 },
      maxStorageMB: { type: Number, default: 100 },
    },
    // For the paid 'standard' plan, `price` is the per-student rate per term
    // (NLe). The amount charged = price × number of students paid for.
    price:    { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model('Plan', planSchema);
