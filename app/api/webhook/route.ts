// app/api/webhook/route.ts
import { validateAuth } from '../../../lib/auth';
import { checkRateLimit, getClientIp, getRateLimitHeaders } from '../../../lib/rate-limit';
import { WebhookPayloadSchema } from '../../../lib/validations';
import { apiError, apiSuccess } from '../../../lib/response';
import { logSecurityEvent } from '../../../lib/security-logger';
import { prisma } from '../../../lib/prisma';

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const userAgent = request.headers.get('user-agent');

  // 1. Autenticação obrigatória por Bearer Token (M2M)
  const auth = validateAuth(request, { requireBearer: true });
  if (!auth.authenticated) {
    await logSecurityEvent({
      event: 'AUTH_FAILED',
      route: '/api/webhook',
      ip,
      userAgent,
      details: auth.error,
    });
    return apiError(auth.error || 'Acesso não autorizado ao Webhook.', 401);
  }

  // 2. Rate Limiting distribuído (60 req/min)
  const rateLimit = await checkRateLimit(request, 'webhook', { limit: 60, windowMs: 60_000 });
  const rateLimitHeaders = getRateLimitHeaders(rateLimit);

  if (!rateLimit.success) {
    await logSecurityEvent({
      event: 'RATE_LIMIT_EXCEEDED',
      route: '/api/webhook',
      ip,
      userAgent,
    });
    return apiError('Limite de requisições excedido no Webhook. Tente novamente mais tarde.', 429, {
      headers: rateLimitHeaders,
    });
  }

  // 3. Validação de tamanho e corpo com Zod
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > 1_048_576) {
    // 1MB max
    return apiError('Payload excede o limite máximo permitido (1MB).', 413, {
      headers: rateLimitHeaders,
    });
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    await logSecurityEvent({
      event: 'INVALID_PAYLOAD',
      route: '/api/webhook',
      ip,
      userAgent,
      details: 'JSON malformado',
    });
    return apiError('Payload inválido. Esperado corpo em formato JSON.', 400, {
      headers: rateLimitHeaders,
    });
  }

  const parseResult = WebhookPayloadSchema.safeParse(rawBody);
  if (!parseResult.success) {
    const errorDetails = parseResult.error.issues.map((i) => i.message).join(' ');
    await logSecurityEvent({
      event: 'INVALID_PAYLOAD',
      route: '/api/webhook',
      ip,
      userAgent,
      details: errorDetails,
    });
    return apiError(`Erro de validação no Webhook: ${errorDetails}`, 400, {
      headers: rateLimitHeaders,
    });
  }

  const validatedData = parseResult.data;

  // 4. Verificação de Idempotência contra Replay de Eventos
  if (validatedData.eventId) {
    const existingLog = await prisma.auditLog.findUnique({
      where: { eventId: validatedData.eventId },
    });

    if (existingLog) {
      await logSecurityEvent({
        event: 'WEBHOOK_REPLAY',
        route: '/api/webhook',
        ip,
        userAgent,
        details: `Idempotência acionada para eventId: ${validatedData.eventId}`,
      });

      return apiSuccess(
        {
          message: 'Evento já processado anteriormente (idempotência garantida).',
          deduplicated: true,
          data: {
            id: existingLog.id,
            eventId: existingLog.eventId,
            sku: existingLog.sku,
            status: existingLog.status,
          },
        },
        { status: 200, headers: rateLimitHeaders }
      );
    }
  }

  // 5. Persistência segura no Banco de Dados
  try {
    const storedLog = await prisma.auditLog.create({
      data: {
        eventId: validatedData.eventId || null,
        sku: validatedData.sku,
        erp: validatedData.erp,
        mkt: validatedData.mkt,
        failure: validatedData.failure,
        status: validatedData.status,
      },
    });

    return apiSuccess(
      {
        message: 'Log de auditoria integrado e persistido com sucesso.',
        data: {
          id: storedLog.id,
          eventId: storedLog.eventId,
          sku: storedLog.sku,
          status: storedLog.status,
          createdAt: storedLog.createdAt,
        },
      },
      { status: 201, headers: rateLimitHeaders }
    );
  } catch (error: unknown) {
    console.error('Erro ao persistir evento no banco SQLite:', error);
    return apiError('Falha interna ao registrar divergência no banco de dados.', 500, {
      headers: rateLimitHeaders,
    });
  }
}