import 'dotenv/config';
import { createServer } from 'http';
import connectDB from './config/db.js';
import { connectRedis } from './config/redis.js';
import logger from './utils/logger.js';
import seedPlans from './config/seedPlans.js';
import { migrateIndexes } from './config/migrateIndexes.js';
import { startAutoFinalizeJob } from './jobs/autoFinalizeAttendance.js';
import { startSnapshotCaptureJob } from './jobs/captureOnlineSnapshot.js';
import { backfillQRTokens } from './services/qrAttendance.service.js';
import { initSocket } from './socket.js';

const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET'];
for (const key of requiredEnvVars) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

// Fly.io sets PORT to 8080 by default
const PORT = process.env.PORT || 8080;

(async () => {
  try {
    await connectDB(process.env.MONGO_URI || 'mongodb://localhost:27017/myapp');

    // Connect to Redis before app.js is evaluated so makeRateLimitStore
    // sees a ready client. Falls back to in-memory if Redis is unavailable.
    await connectRedis();
    const { default: app } = await import('./app.js');

    await migrateIndexes();

    try {
      await seedPlans();
    } catch (err) {
      console.warn('Failed to seed plans:', err.message);
    }

    // Start background jobs and one-time migrations (DB is now connected)
    startAutoFinalizeJob();
    startSnapshotCaptureJob();
    backfillQRTokens();

    const server = createServer(app);
    initSocket(server);

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


