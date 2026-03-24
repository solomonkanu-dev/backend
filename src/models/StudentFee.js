// models/StudentFee.js
import mongoose from "mongoose";

const studentFeeSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
    },
    institute: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Institute",
      required: true,
    },
    fees: [
      {
        fee: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "FeeParticular",
        },
        amount: Number,
        paid: {
          type: Number,
          default: 0,
        },
      },
    ],
    totalAmount: Number,
    balance: Number,
    status: {
      type: String,
      enum: ["unpaid", "partial", "paid"],
      default: "unpaid",
    },
  },
  { timestamps: true }
);

export default mongoose.model("StudentFee", studentFeeSchema);
