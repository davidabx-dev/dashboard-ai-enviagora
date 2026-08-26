// app/api/audit-logs/route.ts
import { prisma } from '../../../lib/prisma';
import { validateAuth } from '../../../lib/auth';
import { checkRateLimit, getClientIp, getRateLimitHeaders } from '../../../lib/rate-limit';
import { apiError, apiSuccess } from '../../../lib/response';
import { logSecurityEvent } from '../../../lib/security-logger';

export async function GET(request: Request) {
  const ip = getClientIp(request);
  const userAgent = request.headers.get('user-agent');

  // 1. Verificação de Autenticação (Sessão Cookie ou Bearer Token)
  const auth = validateAuth(request);
  if (!auth.authenticated) {
    await logSecurityEvent({
      event: 'AUTH_FAILED',
      route: '/api/audit-logs',
      ip,
      userAgent,
      details: auth.error,
    });
    return apiError(auth.error || 'Acesso não autorizado aos logs de auditoria.', 401);
  }

  // 2. Verificação de Rate Limit (60 requisições por minuto)
  const rateLimit = await checkRateLimit(request, 'audit-logs', { limit: 60, windowMs: 60_000 });
  const rateLimitHeaders = getRateLimitHeaders(rateLimit);

  if (!rateLimit.success) {
    await logSecurityEvent({
      event: 'RATE_LIMIT_EXCEEDED',
      route: '/api/audit-logs',
      ip,
      userAgent,
    });
    return apiError(
      'Limite de requisições excedido para leitura de logs. Tente novamente em instantes.',
      429,
      { headers: rateLimitHeaders }
    );
  }

  // 3. Paginação segura
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const limit = Math.min(200, Math.max(1, Number(searchParams.get('limit')) || 100));
  const skip = (page - 1) * limit;

  try {
    const total = await prisma.auditLog.count();

    // Se a tabela estiver vazia, popula dados de teste para demonstração inicial
    if (total === 0) {
      await prisma.auditLog.createMany({
        data: [
          { sku: 'ENV-102', erp: 50, mkt: 42, failure: 'Quebra de Estoque Físico', status: 'CRITICAL' },
          { sku: 'ENV-309', erp: 15, mkt: 0, failure: 'SKU Ausente na API', status: 'CRITICAL' },
          { sku: 'ENV-505', erp: 12, mkt: 12, failure: 'Nenhuma', status: 'OK' },
        ],
      });
    }

    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    return apiSuccess(
      {
        data: logs,
        pagination: {
          page,
          limit,
          total: total === 0 ? 3 : total,
          totalPages: Math.ceil((total === 0 ? 3 : total) / limit),
        },
      },
      { headers: rateLimitHeaders }
    );
  } catch (error: unknown) {
    console.error('Erro na leitura de audit logs:', error);
    return apiError('Falha interna ao consultar logs de auditoria.', 500, {
      headers: rateLimitHeaders,
    });
  }
}