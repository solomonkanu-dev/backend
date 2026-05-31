import mongoose from 'mongoose';

const ruleSectionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    content: { type: String, default: '' },
    order: { type: Number, default: 0 },
  },
  { _id: false }
);

const ruleBookSchema = new mongoose.Schema(
  {
    institute: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institute',
      required: true,
      unique: true,
    },
    sections: { type: [ruleSectionSchema], default: [] },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model('RuleBook', ruleBookSchema);
