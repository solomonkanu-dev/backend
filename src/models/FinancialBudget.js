import mongoose from 'mongoose';

const financialBudgetSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['income', 'expense'],
      required: true,
    },
    budgetedAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    termId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AcademicTerm',
      required: true,
    },
    academicYear: {
      type: String,
      required: true,
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

financialBudgetSchema.index(
  { institute: 1, termId: 1, category: 1, type: 1 },
  { unique: true }
);

export default mongoose.model('FinancialBudget', financialBudgetSchema);
