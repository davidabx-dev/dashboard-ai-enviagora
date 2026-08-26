// app/api/skus/[sku]/route.ts
import { validateAuth } from '../../../../lib/auth';
import { checkRateLimit, getClientIp, getRateLimitHeaders } from '../../../../lib/rate-limit';
import { apiError, apiSuccess } from '../../../../lib/response';
import { logSecurityEvent } from '../../../../lib/security-logger';
import { getSkuDetails } from '../../../../lib/skus';

export async function GET(
  request: Request,
  props: { params: Promise<{ sku: string }> }
) {
  const params = await props.params;
  const ip = getClientIp(request);
  const userAgent = request.headers.get('user-agent');

  // 1. Verificação de Autenticação
  const auth = validateAuth(request);
  if (!auth.authenticated) {
    await logSecurityEvent({
      event: 'AUTH_FAILED',
      route: `/api/skus/${params.sku}`,
      ip,
      userAgent,
      details: auth.error,
    });
    return apiError(auth.error || 'Acesso não autorizado aos detalhes do SKU.', 401);
  }

  // 2. Verificação de Rate Limit (60 req/min)
  const rateLimit = await checkRateLimit(request, 'skus-detail', { limit: 60, windowMs: 60_000 });
  const rateLimitHeaders = getRateLimitHeaders(rateLimit);

  if (!rateLimit.success) {
    return apiError('Limite de requisições excedido. Tente novamente em instantes.', 429, {
      headers: rateLimitHeaders,
    });
  }

  const rawSku = params.sku;
  if (!rawSku || rawSku.trim().length === 0) {
    return apiError('Código SKU inválido.', 400, { headers: rateLimitHeaders });
  }

  try {
    const skuData = await getSkuDetails(decodeURIComponent(rawSku), auth.userId);
    if (!skuData) {
      return apiError('SKU não localizado na base de auditoria.', 404, {
        headers: rateLimitHeaders,
      });
    }

    return apiSuccess({ data: skuData }, { headers: rateLimitHeaders });
  } catch (error: unknown) {
    console.error('Erro na consulta do SKU detalhado:', error);
    return apiError('Falha interna ao consultar detalhes do SKU.', 500, {
      headers: rateLimitHeaders,
    });
  }
}
