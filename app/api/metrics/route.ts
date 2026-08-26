// app/api/metrics/route.ts
import { validateAuth } from '../../../lib/auth';
import { checkRateLimit, getClientIp, getRateLimitHeaders } from '../../../lib/rate-limit';
import { apiError, apiSuccess } from '../../../lib/response';
import { logSecurityEvent } from '../../../lib/security-logger';
import { calculateMetrics, MetricsFilterOptions } from '../../../lib/metrics';

export async function GET(request: Request) {
  const ip = getClientIp(request);
  const userAgent = request.headers.get('user-agent');

  // 1. Verificação de Autenticação
  const auth = validateAuth(request);
  if (!auth.authenticated) {
    await logSecurityEvent({
      event: 'AUTH_FAILED',
      route: '/api/metrics',
      ip,
      userAgent,
      details: auth.error,
    });
    return apiError(auth.error || 'Acesso não autorizado às métricas analíticas.', 401);
  }

  // 2. Verificação de Rate Limit (60 req/min)
  const rateLimit = await checkRateLimit(request, 'metrics', { limit: 60, windowMs: 60_000 });
  const rateLimitHeaders = getRateLimitHeaders(rateLimit);

  if (!rateLimit.success) {
    await logSecurityEvent({
      event: 'RATE_LIMIT_EXCEEDED',
      route: '/api/metrics',
      ip,
      userAgent,
    });
    return apiError('Limite de requisições excedido. Tente novamente em instantes.', 429, {
      headers: rateLimitHeaders,
    });
  }

  // 3. Extração segura de parâmetros
  const { searchParams } = new URL(request.url);
  const period = (searchParams.get('period') || '30d') as MetricsFilterOptions['period'];
  const status = (searchParams.get('status') || 'ALL') as MetricsFilterOptions['status'];
  const sku = searchParams.get('sku') || undefined;

  try {
    const metricsData = await calculateMetrics({ period, status, sku });
    return apiSuccess({ data: metricsData }, { headers: rateLimitHeaders });
  } catch (error: unknown) {
    console.error('Erro no cálculo de métricas:', error);
    return apiError('Falha interna ao calcular métricas de auditoria.', 500, {
      headers: rateLimitHeaders,
    });
  }
}
