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
    // IMPORTANT: before/after should contain ONLY minimal, sanitized diffs (not full documents).
    // Exclude sensitive fields: password, token, apiKey, secret, etc.
    // Use the sanitizeForAudit() function before storing to limit object size and redact PII.
    before: { type: mongoose.Schema.Types.Mixed, default: null },
    after:  { type: mongoose.Schema.Types.Mixed, default: null },
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

// TTL (Time To Live) index: Auto-expire audit logs after 90 days to control storage growth.
// Set expireAfterSeconds to 7776000 (90 days * 24 hours * 60min * 60sec)
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

export default mongoose.model("AuditLog", auditLogSchema);
