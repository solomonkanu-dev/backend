import logger from '../utils/logger.js';

const errorHandler = (err, req, res, next) => {
  logger.error(err);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'Server Error',
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  });
};

export default errorHandler;
