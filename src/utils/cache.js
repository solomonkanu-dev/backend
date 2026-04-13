import { getRedisClient } from '../config/redis.js';
import logger from './logger.js';

// All keys are namespaced to avoid collisions if the Redis instance is shared
const NS = 'studman:';

const k = (key) => `${NS}${key}`;

/**
 * Get a cached value. Returns null on miss or Redis failure.
 */
export const cacheGet = async (key) => {
  const client = getRedisClient();
  if (!client) return null;
  try {
    const raw = await client.get(k(key));
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    logger.warn(`[cache] get failed for "${key}": ${err.message}`);
    return null;
  }
};

/**
 * Set a cached value with a TTL in seconds.
 */
export const cacheSet = async (key, value, ttlSeconds) => {
  const client = getRedisClient();
  if (!client) return;
  try {
    await client.set(k(key), JSON.stringify(value), 'EX', ttlSeconds);
  } catch (err) {
    logger.warn(`[cache] set failed for "${key}": ${err.message}`);
  }
};

/**
 * Delete a single cache key.
 */
export const cacheDel = async (key) => {
  const client = getRedisClient();
  if (!client) return;
  try {
    await client.del(k(key));
  } catch (err) {
    logger.warn(`[cache] del failed for "${key}": ${err.message}`);
  }
};

/**
 * Delete all keys matching a glob pattern (e.g. "analytics:*").
 * Uses SCAN to avoid blocking Redis on large keyspaces.
 */
export const cacheDelPattern = async (pattern) => {
  const client = getRedisClient();
  if (!client) return;
  try {
    let cursor = '0';
    do {
      const [next, keys] = await client.scan(cursor, 'MATCH', k(pattern), 'COUNT', 100);
      cursor = next;
      if (keys.length) await client.del(...keys);
    } while (cursor !== '0');
  } catch (err) {
    logger.warn(`[cache] delPattern failed for "${pattern}": ${err.message}`);
  }
};
