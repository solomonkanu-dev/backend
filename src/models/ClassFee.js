// models/ClassFee.js
import mongoose from "mongoose";

const classFeeSchema = new mongoose.Schema(
  {
    institute: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Institute",
      required: true,
    },
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
    },
    fees: [
      {
        fee: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "FeeParticular",
          required: true,
        },
        amount: {
          type: Number,
          required: true,
        },
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

export default mongoose.model("ClassFee", classFeeSchema);
