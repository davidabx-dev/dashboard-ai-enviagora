// app/api/favorites/route.ts
import { z } from 'zod';
import { validateAuth } from '../../../lib/auth';
import { checkRateLimit, getClientIp, getRateLimitHeaders } from '../../../lib/rate-limit';
import { apiError, apiSuccess } from '../../../lib/response';
import { logSecurityEvent } from '../../../lib/security-logger';
import { getUserFavorites, addFavoriteSku } from '../../../lib/favorites';

const FavoriteSchema = z.object({
  sku: z.string().trim().min(1, 'Código SKU obrigatório.').max(100),
});

export async function GET(request: Request) {
  const ip = getClientIp(request);
  const userAgent = request.headers.get('user-agent');

  const auth = validateAuth(request);
  if (!auth.authenticated || !auth.userId) {
    await logSecurityEvent({
      event: 'AUTH_FAILED',
      route: '/api/favorites',
      ip,
      userAgent,
      details: auth.error,
    });
    return apiError(auth.error || 'Acesso não autorizado aos favoritos.', 401);
  }

  const rateLimit = await checkRateLimit(request, 'favorites-get', { limit: 60, windowMs: 60_000 });
  const rateLimitHeaders = getRateLimitHeaders(rateLimit);

  if (!rateLimit.success) {
    return apiError('Limite de requisições excedido.', 429, { headers: rateLimitHeaders });
  }

  try {
    const favorites = await getUserFavorites(auth.userId);
    return apiSuccess({ data: favorites }, { headers: rateLimitHeaders });
  } catch (error: unknown) {
    console.error('Erro ao listar favoritos:', error);
    return apiError('Falha interna ao consultar favoritos.', 500, { headers: rateLimitHeaders });
  }
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const userAgent = request.headers.get('user-agent');

  const auth = validateAuth(request);
  if (!auth.authenticated || !auth.userId) {
    await logSecurityEvent({
      event: 'AUTH_FAILED',
      route: '/api/favorites',
      ip,
      userAgent,
      details: auth.error,
    });
    return apiError(auth.error || 'Acesso não autorizado.', 401);
  }

  const rateLimit = await checkRateLimit(request, 'favorites-post', { limit: 30, windowMs: 60_000 });
  const rateLimitHeaders = getRateLimitHeaders(rateLimit);

  if (!rateLimit.success) {
    return apiError('Limite de requisições excedido.', 429, { headers: rateLimitHeaders });
  }

  try {
    const body = await request.json();
    const parsed = FavoriteSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(parsed.error.issues?.[0]?.message || parsed.error.message || 'Payload inválido.', 400, {
        headers: rateLimitHeaders,
      });
    }

    const created = await addFavoriteSku(auth.userId, parsed.data.sku);
    return apiSuccess({ data: created, message: 'SKU favoritado com sucesso.' }, { headers: rateLimitHeaders });
  } catch (error: unknown) {
    console.error('Erro ao adicionar favorito:', error);
    return apiError('Falha interna ao salvar favorito.', 500, { headers: rateLimitHeaders });
  }
}
