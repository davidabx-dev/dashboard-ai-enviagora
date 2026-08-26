// app/api/favorites/[sku]/route.ts
import { validateAuth } from '../../../../lib/auth';
import { checkRateLimit, getClientIp, getRateLimitHeaders } from '../../../../lib/rate-limit';
import { apiError, apiSuccess } from '../../../../lib/response';
import { logSecurityEvent } from '../../../../lib/security-logger';
import { removeFavoriteSku } from '../../../../lib/favorites';

export async function DELETE(
  request: Request,
  props: { params: Promise<{ sku: string }> }
) {
  const params = await props.params;
  const ip = getClientIp(request);
  const userAgent = request.headers.get('user-agent');

  const auth = validateAuth(request);
  if (!auth.authenticated || !auth.userId) {
    await logSecurityEvent({
      event: 'AUTH_FAILED',
      route: `/api/favorites/${params.sku}`,
      ip,
      userAgent,
      details: auth.error,
    });
    return apiError(auth.error || 'Acesso não autorizado.', 401);
  }

  const rateLimit = await checkRateLimit(request, 'favorites-delete', { limit: 30, windowMs: 60_000 });
  const rateLimitHeaders = getRateLimitHeaders(rateLimit);

  if (!rateLimit.success) {
    return apiError('Limite de requisições excedido.', 429, { headers: rateLimitHeaders });
  }

  const rawSku = params.sku;
  if (!rawSku || rawSku.trim().length === 0) {
    return apiError('Código SKU inválido.', 400, { headers: rateLimitHeaders });
  }

  try {
    await removeFavoriteSku(auth.userId, decodeURIComponent(rawSku));
    return apiSuccess({ message: 'Favorito removido com sucesso.' }, { headers: rateLimitHeaders });
  } catch (error: unknown) {
    console.error('Erro ao remover favorito:', error);
    return apiError('Falha interna ao remover favorito.', 500, { headers: rateLimitHeaders });
  }
}
