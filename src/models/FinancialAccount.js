import mongoose from 'mongoose';

const financialAccountSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['bank', 'cash', 'mobile_money'],
      default: 'bank',
    },
    bankName: {
      type: String,
      default: '',
    },
    accountNumber: {
      type: String,
      default: '',
    },
    openingBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    institute: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institute',
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

financialAccountSchema.index({ institute: 1, isActive: 1 });

export default mongoose.model('FinancialAccount', financialAccountSchema);
