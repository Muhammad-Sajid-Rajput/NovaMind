// NovaMind — redis.js — Phase 5
import Redis from 'ioredis';
import { logger } from '../utils/logger.js';

const createRedisConnection = () => {
  const client = new Redis({
    host:            process.env.REDIS_HOST || '127.0.0.1',
    port:            parseInt(process.env.REDIS_PORT) || 6379,
    maxRetriesPerRequest: null, // required by BullMQ
    enableReadyCheck: false,
    retryStrategy: (times) => {
      if (times > 10) {
        logger.error('Redis connection failed after 10 retries');
        return null;
      }
      return Math.min(times * 500, 3000);
    },
  });

  client.on('connect', () => 
    logger.info('Redis connected successfully'));
  client.on('error', (err) => 
    logger.error('Redis error', { error: err.message }));
  client.on('reconnecting', () => 
    logger.warn('Redis reconnecting...'));

  return client;
};

// Create two separate connections:
// BullMQ requires separate connections for queue and worker
export const queueRedis  = createRedisConnection();
export const workerRedis = createRedisConnection();

export default createRedisConnection;
