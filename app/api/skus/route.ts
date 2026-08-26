// app/api/skus/route.ts
import { validateAuth } from '../../../lib/auth';
import { checkRateLimit, getClientIp, getRateLimitHeaders } from '../../../lib/rate-limit';
import { apiError, apiSuccess } from '../../../lib/response';
import { logSecurityEvent } from '../../../lib/security-logger';
import { getSkusList, SkuFilterOptions } from '../../../lib/skus';

export async function GET(request: Request) {
  const ip = getClientIp(request);
  const userAgent = request.headers.get('user-agent');

  // 1. Verificação de Autenticação
  const auth = validateAuth(request);
  if (!auth.authenticated) {
    await logSecurityEvent({
      event: 'AUTH_FAILED',
      route: '/api/skus',
      ip,
      userAgent,
      details: auth.error,
    });
    return apiError(auth.error || 'Acesso não autorizado ao controle de SKUs.', 401);
  }

  // 2. Verificação de Rate Limit (60 req/min)
  const rateLimit = await checkRateLimit(request, 'skus', { limit: 60, windowMs: 60_000 });
  const rateLimitHeaders = getRateLimitHeaders(rateLimit);

  if (!rateLimit.success) {
    await logSecurityEvent({
      event: 'RATE_LIMIT_EXCEEDED',
      route: '/api/skus',
      ip,
      userAgent,
    });
    return apiError('Limite de requisições excedido. Tente novamente em instantes.', 429, {
      headers: rateLimitHeaders,
    });
  }

  // 3. Extração e sanitização de query parameters
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 15));
  const search = searchParams.get('search') || undefined;
  const status = (searchParams.get('status') || 'ALL') as SkuFilterOptions['status'];
  const divergence = (searchParams.get('divergence') || 'ALL') as SkuFilterOptions['divergence'];
  const sortBy = (searchParams.get('sortBy') || 'createdAt') as SkuFilterOptions['sortBy'];
  const sortOrder = (searchParams.get('sortOrder') || 'desc') as SkuFilterOptions['sortOrder'];

  try {
    const result = await getSkusList({
      page,
      limit,
      search,
      status,
      divergence,
      sortBy,
      sortOrder,
      userId: auth.userId,
    });

    return apiSuccess(result, { headers: rateLimitHeaders });
  } catch (error: unknown) {
    console.error('Erro na consulta de SKUs:', error);
    return apiError('Falha interna ao consultar listagem de SKUs.', 500, {
      headers: rateLimitHeaders,
    });
  }
}
