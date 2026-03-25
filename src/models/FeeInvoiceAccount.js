import mongoose from "mongoose";

const feeInvoiceAccountSchema = new mongoose.Schema(
  {
    institute: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Institute",
      required: true,
    },
    bankName: {
      type: String,
      required: true,
      trim: true,
    },
    bankAddress: {
      type: String,
      required: true,
      trim: true,
    },
    bankNo: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    bankLogo: {
      type: String,
      default: "",
    },
    instructions: {
      type: String,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

feeInvoiceAccountSchema.index({ institute: 1, isActive: 1 });

export default mongoose.model("FeeInvoiceAccount", feeInvoiceAccountSchema);
