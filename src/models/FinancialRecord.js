import mongoose from 'mongoose';

const financialRecordSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['income', 'expense'],
      required: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    date: {
      type: Date,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'bank_transfer', 'card', 'mobile_money', 'cheque', 'other'],
      default: 'cash',
    },
    reference: {
      type: String,
      default: '',
    },
    termId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AcademicTerm',
      default: null,
    },
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FinancialAccount',
      default: null,
    },
    institute: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institute',
      required: true,
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

financialRecordSchema.index({ institute: 1, type: 1, date: -1 });
financialRecordSchema.index({ institute: 1, termId: 1 });
financialRecordSchema.index({ institute: 1, accountId: 1 });

export default mongoose.model('FinancialRecord', financialRecordSchema);
