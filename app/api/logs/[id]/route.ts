// app/api/logs/[id]/route.ts
import { validateAuth } from '../../../../lib/auth';
import { checkRateLimit, getClientIp, getRateLimitHeaders } from '../../../../lib/rate-limit';
import { apiError, apiSuccess } from '../../../../lib/response';
import { logSecurityEvent } from '../../../../lib/security-logger';
import { getLogById } from '../../../../lib/logs';

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const ip = getClientIp(request);
  const userAgent = request.headers.get('user-agent');

  const auth = validateAuth(request);
  if (!auth.authenticated) {
    await logSecurityEvent({
      event: 'AUTH_FAILED',
      route: `/api/logs/${params.id}`,
      ip,
      userAgent,
      details: auth.error,
    });
    return apiError(auth.error || 'Acesso não autorizado.', 401);
  }

  const rateLimit = await checkRateLimit(request, 'logs-detail', { limit: 60, windowMs: 60_000 });
  const rateLimitHeaders = getRateLimitHeaders(rateLimit);

  if (!rateLimit.success) {
    return apiError('Limite de requisições excedido.', 429, { headers: rateLimitHeaders });
  }

  try {
    const log = await getLogById(params.id);
    if (!log) {
      return apiError('Log de auditoria não encontrado.', 404, { headers: rateLimitHeaders });
    }

    return apiSuccess({ data: log }, { headers: rateLimitHeaders });
  } catch (error: unknown) {
    console.error('Erro na consulta do log por ID:', error);
    return apiError('Falha interna ao consultar detalhes do log.', 500, {
      headers: rateLimitHeaders,
    });
  }
}
