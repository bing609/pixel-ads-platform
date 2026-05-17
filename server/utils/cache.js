/**
 * Redis Cache Service
 * Handles caching for improved performance
 * Used for: grid status, user sessions, access tokens
 */

import redis from 'redis';

let redisClient = null;

/**
 * Initialize Redis Connection
 * @returns {Promise<void>}
 */
export const initRedis = async () => {
  try {
    redisClient = redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });

    redisClient.on('error', (err) => {
      console.error('Redis Error:', err);
    });

    redisClient.on('connect', () => {
      console.log('Connected to Redis');
    });

    await redisClient.connect();
  } catch (error) {
    console.error('Redis initialization error:', error);
    // Don't fail if Redis is not available
    redisClient = null;
  }
};

/**
 * Get value from cache
 * @param {string} key - Cache key
 * @returns {Promise<any>} Cached value or null
 */
export const getCache = async (key) => {
  if (!redisClient) return null;

  try {
    const value = await redisClient.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error('Cache get error:', error);
    return null;
  }
};

/**
 * Set value in cache
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 * @param {number} ttl - Time to live in seconds (default: 5 minutes)
 * @returns {Promise<boolean>} True if set successfully
 */
export const setCache = async (key, value, ttl = 300) => {
  if (!redisClient) return false;

  try {
    await redisClient.setEx(key, ttl, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error('Cache set error:', error);
    return false;
  }
};

/**
 * Delete key from cache
 * @param {string} key - Cache key
 * @returns {Promise<boolean>} True if deleted
 */
export const deleteCache = async (key) => {
  if (!redisClient) return false;

  try {
    await redisClient.del(key);
    return true;
  } catch (error) {
    console.error('Cache delete error:', error);
    return false;
  }
};

/**
 * Clear all cache
 * @returns {Promise<boolean>} True if cleared
 */
export const clearCache = async () => {
  if (!redisClient) return false;

  try {
    await redisClient.flushDb();
    return true;
  } catch (error) {
    console.error('Cache clear error:', error);
    return false;
  }
};

/**
 * Increment counter in cache
 * @param {string} key - Cache key
 * @returns {Promise<number>} New counter value
 */
export const incrementCounter = async (key) => {
  if (!redisClient) return 1;

  try {
    return await redisClient.incr(key);
  } catch (error) {
    console.error('Counter increment error:', error);
    return 1;
  }
};
