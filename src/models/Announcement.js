import mongoose from 'mongoose';

const announcementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    body:  { type: String, required: true },
    type:  { type: String, enum: ['system_wide', 'institute_specific'], default: 'system_wide' },
    targetRoles: {
      type: [String],
      enum: ['admin', 'lecturer', 'student', 'super_admin'],
      default: ['admin', 'lecturer', 'student'],
    },
    institute: { type: mongoose.Schema.Types.ObjectId, ref: 'Institute', default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    expiresAt: { type: Date, default: null },
    isActive:  { type: Boolean, default: true },
    readBy: [
      {
        user:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        readAt: { type: Date, default: Date.now },
        _id: false,
      },
    ],
  },
  { timestamps: true }
);

announcementSchema.index({ institute: 1, isActive: 1, createdAt: -1 });
announcementSchema.index({ createdBy: 1 });

export default mongoose.model('Announcement', announcementSchema);
