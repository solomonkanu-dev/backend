import mongoose from "mongoose";

const salarySchema = new mongoose.Schema(
  {
    lecturer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    institute: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Institute",
      required: true,
    },
    role: {
      type: String,
      enum: ["lecturer", "admin"],
      required: true,
    },
    salaryMonth: {
      type: String,
      required: true, // Format: "YYYY-MM" e.g., "2025-01"
    },
    date: {
      type: Date,
      required: true,
    },
    salary: {
      type: Number,
      required: true,
      min: 0,
    },
    bonus: {
      type: Number,
      default: 0,
      min: 0,
    },
    deduction: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    remarks: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["pending", "paid", "cancelled"],
      default: "pending",
    },
    paidDate: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Calculate total amount before saving
salarySchema.pre("save", function (next) {
  this.totalAmount = this.salary + (this.bonus || 0) - (this.deduction || 0);
  next();
});

// Index for efficient queries
salarySchema.index({ lecturer: 1, institute: 1, salaryMonth: 1 }, { unique: true });
salarySchema.index({ institute: 1, status: 1 });
salarySchema.index({ salaryMonth: 1 });

export default mongoose.model("Salary", salarySchema);
