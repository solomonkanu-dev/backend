import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  institute: { type: mongoose.Schema.Types.ObjectId, ref: 'Institute', unique: true },
  smtp: {
    host:      { type: String, default: '' },
    port:      { type: Number, default: 587 },
    secure:    { type: Boolean, default: false },
    user:      { type: String, default: '' },
    pass:      { type: String, default: '' },
    fromEmail: { type: String, default: '' },
    fromName:  { type: String, default: '' },
  },
  enabled: {
    feePayment:       { type: Boolean, default: true },
    resultsPublished: { type: Boolean, default: true },
    announcement:     { type: Boolean, default: true },
    assignmentPosted: { type: Boolean, default: true },
    attendanceAlert:  { type: Boolean, default: true },
  },
}, { timestamps: true });

export default mongoose.model('NotificationSettings', schema);
