const Redis = require('redis');
const logger = require('./logger');

class RedisClient {
  constructor() {
    this.client = Redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      retry_strategy: (options) => {
        if (options.error && options.error.code === 'ECONNREFUSED') {
          logger.error('Redis connection refused');
          return new Error('Redis connection refused');
        }
        if (options.total_retry_time > 1000 * 60 * 60) {
          logger.error('Redis retry time exhausted');
          return new Error('Retry time exhausted');
        }
        if (options.attempt > 10) {
          logger.error('Redis max retry attempts reached');
          return undefined;
        }
        return Math.min(options.attempt * 100, 3000);
      }
    });

    this.client.on('error', (err) => {
      logger.error('Redis Client Error', err);
    });

    this.client.on('connect', () => {
      logger.info('Redis Client Connected');
    });

    this.client.on('ready', () => {
      logger.info('Redis Client Ready');
    });

    this.client.on('end', () => {
      logger.info('Redis Client Disconnected');
    });
  }

  async connect() {
    if (!this.client.isOpen) {
      await this.client.connect();
    }
  }

  async disconnect() {
    if (this.client.isOpen) {
      await this.client.disconnect();
    }
  }

  async get(key) {
    try {
      return await this.client.get(key);
    } catch (error) {
      logger.error('Redis GET error', { key, error: error.message });
      throw error;
    }
  }

  async set(key, value, options = {}) {
    try {
      return await this.client.set(key, value, options);
    } catch (error) {
      logger.error('Redis SET error', { key, error: error.message });
      throw error;
    }
  }

  async setex(key, seconds, value) {
    try {
      return await this.client.setEx(key, seconds, value);
    } catch (error) {
      logger.error('Redis SETEX error', { key, error: error.message });
      throw error;
    }
  }

  async del(key) {
    try {
      return await this.client.del(key);
    } catch (error) {
      logger.error('Redis DEL error', { key, error: error.message });
      throw error;
    }
  }

  async exists(key) {
    try {
      return await this.client.exists(key);
    } catch (error) {
      logger.error('Redis EXISTS error', { key, error: error.message });
      throw error;
    }
  }

  async incr(key) {
    try {
      return await this.client.incr(key);
    } catch (error) {
      logger.error('Redis INCR error', { key, error: error.message });
      throw error;
    }
  }

  async expire(key, seconds) {
    try {
      return await this.client.expire(key, seconds);
    } catch (error) {
      logger.error('Redis EXPIRE error', { key, error: error.message });
      throw error;
    }
  }

  async hget(hash, field) {
    try {
      return await this.client.hGet(hash, field);
    } catch (error) {
      logger.error('Redis HGET error', { hash, field, error: error.message });
      throw error;
    }
  }

  async hset(hash, field, value) {
    try {
      return await this.client.hSet(hash, field, value);
    } catch (error) {
      logger.error('Redis HSET error', { hash, field, error: error.message });
      throw error;
    }
  }

  async hgetall(hash) {
    try {
      return await this.client.hGetAll(hash);
    } catch (error) {
      logger.error('Redis HGETALL error', { hash, error: error.message });
      throw error;
    }
  }
}

module.exports = new RedisClient();
