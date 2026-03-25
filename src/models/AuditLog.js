import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userFullName: { type: String, default: "" },
    userEmail: { type: String, default: "" },
    role: {
      type: String,
      enum: ["super_admin", "admin", "lecturer", "student"],
      required: true,
    },
    institute: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Institute",
      default: null,
    },
    action: {
      type: String,
      required: true,
      trim: true,
    },
    entity: {
      type: String,
      trim: true,
      default: "",   // e.g. "User", "Class", "Result"
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null, // ID of the affected document
    },
    description: {
      type: String,
      trim: true,
      default: "",   // human-readable summary
    },
    ipAddress: { type: String, default: "" },
    userAgent: { type: String, default: "" },
    method: { type: String, default: "" },
    path: { type: String, default: "" },
    statusCode: { type: Number, default: null },
  },
  { timestamps: true }
);

auditLogSchema.index({ institute: 1, createdAt: -1 });
auditLogSchema.index({ user: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });

export default mongoose.model("AuditLog", auditLogSchema);
