// app/api/reports/[id]/route.ts
import { validateAuth } from '../../../../lib/auth';
import { checkRateLimit, getClientIp, getRateLimitHeaders } from '../../../../lib/rate-limit';
import { apiError, apiSuccess } from '../../../../lib/response';
import { logSecurityEvent } from '../../../../lib/security-logger';
import { getReportById } from '../../../../lib/reports';

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const ip = getClientIp(request);
  const userAgent = request.headers.get('user-agent');

  const auth = validateAuth(request);
  if (!auth.authenticated || !auth.userId) {
    await logSecurityEvent({
      event: 'AUTH_FAILED',
      route: `/api/reports/${params.id}`,
      ip,
      userAgent,
      details: auth.error,
    });
    return apiError(auth.error || 'Acesso não autorizado.', 401);
  }

  const rateLimit = await checkRateLimit(request, 'reports-detail', { limit: 60, windowMs: 60_000 });
  const rateLimitHeaders = getRateLimitHeaders(rateLimit);

  if (!rateLimit.success) {
    return apiError('Limite de requisições excedido.', 429, { headers: rateLimitHeaders });
  }

  try {
    const report = await getReportById(params.id, auth.userId);
    if (!report) {
      return apiError('Relatório não encontrado ou sem permissão de acesso.', 404, {
        headers: rateLimitHeaders,
      });
    }

    return apiSuccess({ data: report }, { headers: rateLimitHeaders });
  } catch (error: unknown) {
    console.error('Erro ao consultar relatório por ID:', error);
    return apiError('Falha interna ao consultar relatório.', 500, { headers: rateLimitHeaders });
  }
}
