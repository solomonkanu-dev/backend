import mongoose from 'mongoose';

const planSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      enum: ['free', 'basic', 'pro'],
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
    price:    { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model('Plan', planSchema);
