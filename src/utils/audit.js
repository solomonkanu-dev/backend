import AuditLog from "../models/AuditLog.js";

/**
 * Sanitize an object for audit logging by redacting sensitive fields
 * and limiting its complexity. Removes passwords, tokens, API keys, secrets,
 * and sensitive PII to prevent exposing them in audit logs.
 *
 * @param {*} obj - The object to sanitize (can be null, string, or object)
 * @param {number} maxDepth - Maximum nesting depth to traverse (default: 2)
 * @returns {*} Sanitized version of the object
 */
const sanitizeForAudit = (obj, maxDepth = 2) => {
  if (!obj || typeof obj !== 'object' || maxDepth === 0) {
    return obj;
  }

  // Sensitive field patterns to redact
  const sensitivePatterns = [
    'password', 'token', 'apikey', 'api_key', 'secret',
    'authorization', 'bearer', 'credential', 'ssn', 'otp',
    'refresh', 'access', 'privatekey', 'private_key'
  ];

  const sanitizeKey = (key) => {
    return sensitivePatterns.some(pattern => 
      key.toLowerCase().includes(pattern)
    );
  };

  if (Array.isArray(obj)) {
    return obj.slice(0, 10).map(item => sanitizeForAudit(item, maxDepth - 1));
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (sanitizeKey(key)) {
      // Redact sensitive values
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      // Recursively sanitize nested objects
      sanitized[key] = sanitizeForAudit(value, maxDepth - 1);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
};

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
export const logAudit = async (req, { action, entity = "", entityId = null, description = "", statusCode = null, userOverride = null, before = null, after = null }) => {
  try {
    const actor = userOverride || req.user;
    if (!actor) return;

    const instituteId = actor.institute?._id || actor.institute || null;

    // Sanitize before/after to ensure no sensitive data or excessively large objects are logged
    const sanitizedBefore = before ? sanitizeForAudit(before) : null;
    const sanitizedAfter = after ? sanitizeForAudit(after) : null;

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
      before: sanitizedBefore,
      after: sanitizedAfter,
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
