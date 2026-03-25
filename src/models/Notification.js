import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    institute: { type: mongoose.Schema.Types.ObjectId, ref: 'Institute', default: null },
    type: {
      type: String,
      enum: [
        'new_student_enrolled',
        'fee_overdue',
        'assignment_created',
        'attendance_recorded',
        'new_admin_signup',
        'institute_created',
        'plan_assigned',
        'maintenance_toggled',
        'admin_approved',
        'admin_rejected',
      ],
      required: true,
    },
    title:   { type: String, required: true },
    message: { type: String, required: true },
    relatedEntity: {
      entityType: { type: String, default: '' },
      entityId:   { type: mongoose.Schema.Types.ObjectId, default: null },
    },
    isRead: { type: Boolean, default: false },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);
