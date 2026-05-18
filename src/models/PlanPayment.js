import mongoose from "mongoose";

/**
 * A subscription payment by an institute for its plan.
 * Doubles as the audit record and the source for the printable receipt.
 *  - channel 'online'  → paid via Monime (card / mobile money), status driven
 *                        by verify + webhook.
 *  - channel 'manual'  → cash / bank transfer recorded by a super-admin.
 */
const planPaymentSchema = new mongoose.Schema(
  {
    institute: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Institute",
      required: true,
    },
    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
      required: true,
    },
    term: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AcademicTerm",
      default: null,
    },
    studentCount: { type: Number, required: true, min: 1 },
    pricePerStudent: { type: Number, required: true, min: 0 },
    amount: { type: Number, required: true, min: 0 },
    method: {
      type: String,
      enum: ["card", "mobile_money", "bank_transfer", "cash"],
      required: true,
    },
    channel: {
      type: String,
      enum: ["online", "manual"],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },
    reference: { type: String, default: "" },
    monimeSessionId: { type: String, default: null },
    // Assigned when the payment completes — the human-readable receipt id.
    receiptNumber: { type: String, default: null },
    // Set for channel 'manual' — the super-admin who recorded it.
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    note: { type: String, default: "" },
    paidAt: { type: Date, default: null },
  },
  { timestamps: true }
);

planPaymentSchema.index({ institute: 1, createdAt: -1 });
planPaymentSchema.index({ monimeSessionId: 1 }, { unique: true, sparse: true });
planPaymentSchema.index({ receiptNumber: 1 }, { unique: true, sparse: true });

export default mongoose.model("PlanPayment", planPaymentSchema);
