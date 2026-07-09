// NovaMind — redis.js
// Uses REDIS_URL (rediss:// for Upstash TLS, redis:// for local).
// BullMQ requires two separate ioredis connections — one for the queue,
// one for the worker — so we call createRedisConnection() twice.
import Redis from 'ioredis';
import { logger } from '../utils/logger.js';

const createRedisConnection = () => {
  const client = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null, // required by BullMQ
    enableReadyCheck:     false,
    retryStrategy: (times) => {
      if (times > 10) {
        logger.error('Redis connection failed after 10 retries');
        return null;
      }
      return Math.min(times * 500, 3000);
    },
  });

  client.on('connect',     () => logger.info('Redis connected successfully'));
  client.on('error',       (err) => logger.error('Redis error', { error: err.message }));
  client.on('reconnecting',() => logger.warn('Redis reconnecting...'));

  return client;
};

// Two separate connections required by BullMQ
export const queueRedis  = createRedisConnection();
export const workerRedis = createRedisConnection();

export default createRedisConnection;
