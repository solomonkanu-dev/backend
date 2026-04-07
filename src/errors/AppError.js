/**
 * Operational error — thrown by services for known failure conditions
 * (bad input, not found, forbidden, etc.).  The global error handler
 * detects isOperational=true and returns the message directly to the
 * client without leaking stack traces.
 */
export class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}
