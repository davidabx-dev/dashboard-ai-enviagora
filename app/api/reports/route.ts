// app/api/reports/route.ts
import { z } from 'zod';
import { validateAuth } from '../../../lib/auth';
import { checkRateLimit, getClientIp, getRateLimitHeaders } from '../../../lib/rate-limit';
import { apiError, apiSuccess } from '../../../lib/response';
import { logSecurityEvent } from '../../../lib/security-logger';
import { getUserReports, createExportedReport } from '../../../lib/reports';

const CreateReportSchema = z.object({
  type: z.enum(['GENERAL_AUDIT', 'CRITICAL_ISSUES', 'SKU_HISTORY', 'EXECUTIVE_SUMMARY']),
  title: z.string().trim().min(1, 'Título obrigatório.').max(200),
  filters: z.record(z.string(), z.unknown()).optional(),
  recordCount: z.number().int().min(0),
  format: z.enum(['PDF', 'SHEETS', 'CSV']).default('PDF'),
});

export async function GET(request: Request) {
  const ip = getClientIp(request);
  const userAgent = request.headers.get('user-agent');

  const auth = validateAuth(request);
  if (!auth.authenticated || !auth.userId) {
    await logSecurityEvent({
      event: 'AUTH_FAILED',
      route: '/api/reports',
      ip,
      userAgent,
      details: auth.error,
    });
    return apiError(auth.error || 'Acesso não autorizado aos relatórios.', 401);
  }

  const rateLimit = await checkRateLimit(request, 'reports-get', { limit: 60, windowMs: 60_000 });
  const rateLimitHeaders = getRateLimitHeaders(rateLimit);

  if (!rateLimit.success) {
    return apiError('Limite de requisições excedido.', 429, { headers: rateLimitHeaders });
  }

  try {
    const reports = await getUserReports(auth.userId);
    return apiSuccess({ data: reports }, { headers: rateLimitHeaders });
  } catch (error: unknown) {
    console.error('Erro ao listar relatórios:', error);
    return apiError('Falha interna ao consultar relatórios.', 500, { headers: rateLimitHeaders });
  }
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const userAgent = request.headers.get('user-agent');

  const auth = validateAuth(request);
  if (!auth.authenticated || !auth.userId) {
    await logSecurityEvent({
      event: 'AUTH_FAILED',
      route: '/api/reports',
      ip,
      userAgent,
      details: auth.error,
    });
    return apiError(auth.error || 'Acesso não autorizado.', 401);
  }

  const rateLimit = await checkRateLimit(request, 'reports-post', { limit: 30, windowMs: 60_000 });
  const rateLimitHeaders = getRateLimitHeaders(rateLimit);

  if (!rateLimit.success) {
    return apiError('Limite de requisições excedido.', 429, { headers: rateLimitHeaders });
  }

  try {
    const body = await request.json();
    const parsed = CreateReportSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(parsed.error.issues?.[0]?.message || parsed.error.message || 'Payload de relatório inválido.', 400, {
        headers: rateLimitHeaders,
      });
    }

    const created = await createExportedReport({
      userId: auth.userId,
      type: parsed.data.type,
      title: parsed.data.title,
      filters: parsed.data.filters,
      recordCount: parsed.data.recordCount,
      format: parsed.data.format,
    });

    return apiSuccess({ data: created, message: 'Relatório registrado com sucesso.' }, {
      headers: rateLimitHeaders,
    });
  } catch (error: unknown) {
    console.error('Erro ao registrar relatório exportado:', error);
    return apiError('Falha interna ao salvar metadados do relatório.', 500, {
      headers: rateLimitHeaders,
    });
  }
}
