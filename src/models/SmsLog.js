import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  institute:      { type: mongoose.Schema.Types.ObjectId, ref: 'Institute' },
  recipientUser:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  recipientPhone: String,
  type: {
    type: String,
    enum: ['feePayment', 'resultsPublished', 'announcement', 'assignmentPosted', 'attendanceAlert', 'absenceAlert', 'test'],
  },
  status:  { type: String, enum: ['sent', 'failed'], default: 'sent' },
  error:   { type: String, default: null },
  sentAt:  { type: Date, default: Date.now },
}, { timestamps: false });

schema.index({ institute: 1, sentAt: -1 });

export default mongoose.model('SmsLog', schema);
