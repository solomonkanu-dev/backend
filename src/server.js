import 'dotenv/config';
import { createServer } from 'http';
import app from './app.js';
import connectDB from './config/db.js';
import logger from './utils/logger.js';

// Fly.io sets PORT to 8080 by default
const PORT = process.env.PORT || 8080;

(async () => {
  try {
    await connectDB(process.env.MONGO_URI || 'mongodb://localhost:27017/myapp');
    const server = createServer(app);

    server.listen(PORT, '0.0.0.0', () => {
      logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'}`);
    });

    // Graceful shutdown
    const shutdown = (signal) => {
      logger.info(`${signal} received, shutting down gracefully`);
      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
})();


