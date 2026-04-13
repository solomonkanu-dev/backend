import Redis from 'ioredis';
import logger from '../utils/logger.js';

let client = null;

/**
 * Attempt to connect to Redis. If the connection fails, caching is disabled
 * gracefully — the rest of the app continues without Redis.
 * Call this once at startup before app.js is evaluated.
 */
export const connectRedis = async () => {
  if (!process.env.REDIS_URL) {
    logger.warn('[redis] REDIS_URL not set — caching and Redis rate-limiting disabled');
    return;
  }

  const redis = new Redis(process.env.REDIS_URL, {
    lazyConnect: true,
    connectTimeout: 5000,
    // null = no per-request retry limit; reconnection is handled by retryStrategy
    maxRetriesPerRequest: null,
    retryStrategy: (times) => {
      if (times > 10) return null; // give up after 10 reconnect attempts
      return Math.min(times * 500, 10000);
    },
  });

  redis.on('error', (err) => logger.warn(`[redis] ${err.message}`));
  redis.on('reconnecting', () => logger.info('[redis] Reconnecting...'));

  try {
    await redis.connect();
    client = redis;
    logger.info('[redis] Connected');
  } catch (err) {
    logger.warn(`[redis] Could not connect (${err.message}) — caching disabled`);
    redis.disconnect();
    client = null;
  }
};

export const getRedisClient = () => client;
