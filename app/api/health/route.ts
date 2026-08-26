// app/api/health/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function GET() {
  const startTime = Date.now();

  try {
    // Verificação de conectividade com o banco de dados
    await prisma.$queryRaw`SELECT 1`;
    const latency = Date.now() - startTime;

    return NextResponse.json(
      {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: {
          status: 'connected',
          latencyMs: latency,
        },
        services: {
          groqEngine: Boolean(process.env.GROQ_API_KEY),
          googleSheets: Boolean(
            process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
              process.env.GOOGLE_PRIVATE_KEY &&
              process.env.GOOGLE_SHEET_ID
          ),
          rateLimiter: Boolean(process.env.UPSTASH_REDIS_REST_URL) ? 'redis-distributed' : 'local-sliding-window',
        },
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, private',
        },
      }
    );
  } catch (error) {
    console.error('Falha no health check:', error);
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        database: {
          status: 'disconnected',
        },
      },
      {
        status: 503,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, private',
        },
      }
    );
  }
}
