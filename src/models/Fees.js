import mongoose from 'mongoose';

const feeParticularSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
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

feeParticularSchema.index(
  { title: 1, institute: 1 },
  { unique: true }
);


export default mongoose.model('FeeParticular', feeParticularSchema);
