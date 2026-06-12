// ============================================================
//  El Fogón Criollo — db/redis.js
//  Cliente Redis con ioredis (sesiones, caché, colas Bull)
// ============================================================

const Redis = require('ioredis');
const logger = require('../utils/logger');

const redisConfig = {
  host:        process.env.REDIS_HOST     ?? 'localhost',
  port:        Number(process.env.REDIS_PORT) || 6379,
  password:    process.env.REDIS_PASSWORD ?? undefined,
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  retryStrategy(times) {
    if (times > 5) {
      logger.warn('Redis: máximo de reintentos alcanzado, continuando sin caché');
      return null;
    }
    return Math.min(times * 200, 2000);
  },
};

const redis = new Redis(redisConfig);

redis.on('connect',   () => logger.debug('Redis: conectando...'));
redis.on('ready',     () => logger.info('Redis: listo'));
redis.on('error',     (err) => logger.warn('Redis error (no crítico)', { error: err.message }));
redis.on('close',     () => logger.debug('Redis: conexión cerrada'));
redis.on('reconnecting', () => logger.debug('Redis: reconectando...'));

// Cache helpers
const cache = {
  async get(key) {
    try {
      const val = await redis.get(key);
      return val ? JSON.parse(val) : null;
    } catch { return null; }
  },

  async set(key, value, ttlSeconds = 300) {
    try {
      await redis.setex(key, ttlSeconds, JSON.stringify(value));
      return true;
    } catch { return false; }
  },

  async del(key) {
    try {
      await redis.del(key);
      return true;
    } catch { return false; }
  },

  async invalidatePattern(pattern) {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) await redis.del(...keys);
      return keys.length;
    } catch { return 0; }
  },

  // TTLs predefinidos
  TTL: {
    SHORT:   60,        // 1 min — datos de estado
    MEDIUM:  300,       // 5 min — listas de productos/mesas
    LONG:    3600,      // 1 hora — datos de catálogo
    DAY:     86400,     // 24h — reportes diarios
  },
};

module.exports = { redis, cache };
