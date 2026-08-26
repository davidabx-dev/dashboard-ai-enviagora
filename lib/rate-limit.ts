// lib/rate-limit.ts

interface RateLimitRecord {
  timestamps: number[];
}

interface LockRecord {
  lockId: string;
  expiresAt: number;
}

// Armazenamento em memória local (fallback para ambiente dev e Docker)
const localRateLimitMap = new Map<string, RateLimitRecord>();
const localLockMap = new Map<string, LockRecord>();

if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of localRateLimitMap.entries()) {
      record.timestamps = record.timestamps.filter((t) => now - t < 60_000);
      if (record.timestamps.length === 0) {
        localRateLimitMap.delete(key);
      }
    }
    for (const [key, lock] of localLockMap.entries()) {
      if (now >= lock.expiresAt) {
        localLockMap.delete(key);
      }
    }
  }, 300_000);
}

export interface RateLimitOptions {
  limit: number;
  windowMs?: number;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

/**
 * Extrai o IP real do cliente de forma resiliente
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp) return cfIp.trim();

  return '127.0.0.1';
}

/**
 * Rate Limiting com suporte a Upstash Redis REST API e fallback local
 */
export async function checkRateLimit(
  request: Request,
  endpointKey: string,
  options: RateLimitOptions
): Promise<RateLimitResult> {
  const ip = getClientIp(request);
  const key = `ratelimit:${endpointKey}:${ip}`;
  const windowMs = options.windowMs || 60_000;
  const windowSeconds = Math.ceil(windowMs / 1000);
  const now = Date.now();

  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  // 1. Caso o Redis/Upstash esteja configurado no ambiente serverless
  if (redisUrl && redisToken) {
    try {
      const response = await fetch(`${redisUrl}/pipeline`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${redisToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([
          ['INCR', key],
          ['EXPIRE', key, windowSeconds],
          ['TTL', key],
        ]),
      });

      if (response.ok) {
        const results = await response.json();
        const currentCount = Number(results[0]?.result) || 1;
        const ttl = Number(results[2]?.result) || windowSeconds;

        const remaining = Math.max(0, options.limit - currentCount);
        const success = currentCount <= options.limit;

        return {
          success,
          limit: options.limit,
          remaining,
          reset: ttl > 0 ? ttl : windowSeconds,
          retryAfter: !success ? (ttl > 0 ? ttl : windowSeconds) : undefined,
        };
      }
    } catch (error) {
      console.warn('Falha na comunicação com Upstash Redis, utilizando fallback local:', error);
    }
  }

  // 2. Fallback: Sliding Window em memória local
  let record = localRateLimitMap.get(key);
  if (!record) {
    record = { timestamps: [] };
    localRateLimitMap.set(key, record);
  }

  record.timestamps = record.timestamps.filter((t) => now - t < windowMs);

  if (record.timestamps.length >= options.limit) {
    const oldestTimestamp = record.timestamps[0] || now;
    const resetTime = Math.max(1, Math.ceil((oldestTimestamp + windowMs - now) / 1000));

    return {
      success: false,
      limit: options.limit,
      remaining: 0,
      reset: resetTime,
      retryAfter: resetTime,
    };
  }

  record.timestamps.push(now);
  const resetTime = Math.ceil(windowMs / 1000);

  return {
    success: true,
    limit: options.limit,
    remaining: Math.max(0, options.limit - record.timestamps.length),
    reset: resetTime,
  };
}

/**
 * Trava de exclusão mútua distribuída com TTL e fallback local
 */
export async function acquireDistributedLock(
  lockKey: string,
  ttlSeconds = 30
): Promise<{ acquired: boolean; lockId: string }> {
  const lockId = Math.random().toString(36).substring(2);
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (redisUrl && redisToken) {
    try {
      const response = await fetch(`${redisUrl}/set/${lockKey}/${lockId}/NX/EX/${ttlSeconds}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${redisToken}` },
      });
      if (response.ok) {
        const data = await response.json();
        return { acquired: data.result === 'OK', lockId };
      }
    } catch (e) {
      console.warn('Falha no lock Redis, utilizando fallback local:', e);
    }
  }

  // Fallback local com verificação de expiração
  const now = Date.now();
  const existing = localLockMap.get(lockKey);
  if (existing && now < existing.expiresAt) {
    return { acquired: false, lockId };
  }

  localLockMap.set(lockKey, { lockId, expiresAt: now + ttlSeconds * 1000 });
  return { acquired: true, lockId };
}

export async function releaseDistributedLock(lockKey: string, lockId: string): Promise<void> {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (redisUrl && redisToken) {
    try {
      await fetch(`${redisUrl}/del/${lockKey}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${redisToken}` },
      });
    } catch {
      // Ignore
    }
  }

  const existing = localLockMap.get(lockKey);
  if (existing && existing.lockId === lockId) {
    localLockMap.delete(lockKey);
  }
}

/**
 * Constrói os cabeçalhos HTTP padrão de Rate Limit para a resposta
 */
export function getRateLimitHeaders(result: RateLimitResult): HeadersInit {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(result.reset),
  };

  if (result.retryAfter) {
    headers['Retry-After'] = String(result.retryAfter);
  }

  return headers;
}
