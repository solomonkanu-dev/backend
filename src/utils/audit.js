import AuditLog from "../models/AuditLog.js";

/**
 * Fire-and-forget audit logger. Never throws — logging failures must not
 * break the main request flow.
 *
 * @param {Object} req        - Express request object (provides IP, UA, method, path)
 * @param {Object} options
 * @param {string} options.action      - Action constant e.g. "CREATE_STUDENT"
 * @param {string} [options.entity]    - Resource type e.g. "User", "Class"
 * @param {*}      [options.entityId]  - ID of the affected document
 * @param {string} [options.description] - Human-readable summary
 * @param {number} [options.statusCode]  - HTTP status code of the response
 */
export const logAudit = async (req, { action, entity = "", entityId = null, description = "", statusCode = null, userOverride = null }) => {
  try {
    const actor = userOverride || req.user;
    if (!actor) return;

    const instituteId = actor.institute?._id || actor.institute || null;

    await AuditLog.create({
      user: actor._id,
      userFullName: actor.fullName || "",
      userEmail: actor.email || "",
      role: actor.role,
      institute: instituteId,
      action,
      entity,
      entityId: entityId || null,
      description,
      ipAddress: req.ip || req.headers["x-forwarded-for"] || "",
      userAgent: req.headers["user-agent"] || "",
      method: req.method,
      path: req.originalUrl,
      statusCode,
    });
  } catch (_) {
    // Silently swallow — audit failures must not affect the response
  }
};
