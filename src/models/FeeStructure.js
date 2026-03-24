import mongoose from "mongoose";

const particularSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const feeStructureSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      enum: ["all", "class", "student"],
      required: true,
    },

    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
    },

    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    particulars: {
      type: [particularSchema],
      validate: [(v) => Array.isArray(v) && v.length > 0, "At least one particular is required"],
      required: true,
    },

    totalAmount: { type: Number, required: true, min: 0 },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    instituteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Institute",
    },
  },
  { timestamps: true }
);

export default mongoose.model("FeeStructure", feeStructureSchema);
