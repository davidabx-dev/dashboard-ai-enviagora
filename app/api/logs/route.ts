// app/api/logs/route.ts
import { validateAuth } from '../../../lib/auth';
import { checkRateLimit, getClientIp, getRateLimitHeaders } from '../../../lib/rate-limit';
import { apiError, apiSuccess } from '../../../lib/response';
import { logSecurityEvent } from '../../../lib/security-logger';
import { getLogsList, LogFilterOptions } from '../../../lib/logs';

export async function GET(request: Request) {
  const ip = getClientIp(request);
  const userAgent = request.headers.get('user-agent');

  const auth = validateAuth(request);
  if (!auth.authenticated) {
    await logSecurityEvent({
      event: 'AUTH_FAILED',
      route: '/api/logs',
      ip,
      userAgent,
      details: auth.error,
    });
    return apiError(auth.error || 'Acesso não autorizado aos logs.', 401);
  }

  const rateLimit = await checkRateLimit(request, 'logs', { limit: 60, windowMs: 60_000 });
  const rateLimitHeaders = getRateLimitHeaders(rateLimit);

  if (!rateLimit.success) {
    return apiError('Limite de requisições excedido.', 429, { headers: rateLimitHeaders });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const limit = Math.min(200, Math.max(1, Number(searchParams.get('limit')) || 20));
  const search = searchParams.get('search') || undefined;
  const status = searchParams.get('status') || undefined;
  const startDate = searchParams.get('startDate') || undefined;
  const endDate = searchParams.get('endDate') || undefined;
  const sortBy = (searchParams.get('sortBy') || 'createdAt') as LogFilterOptions['sortBy'];
  const sortOrder = (searchParams.get('sortOrder') || 'desc') as LogFilterOptions['sortOrder'];

  try {
    const result = await getLogsList({
      page,
      limit,
      search,
      status,
      startDate,
      endDate,
      sortBy,
      sortOrder,
    });

    return apiSuccess(result, { headers: rateLimitHeaders });
  } catch (error: unknown) {
    console.error('Erro ao consultar histórico de logs:', error);
    return apiError('Falha interna ao consultar logs.', 500, { headers: rateLimitHeaders });
  }
}
