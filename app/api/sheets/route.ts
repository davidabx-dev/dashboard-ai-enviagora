// app/api/sheets/route.ts
import { google } from 'googleapis';
import { prisma } from '../../../lib/prisma';
import { validateAuth } from '../../../lib/auth';
import {
  checkRateLimit,
  getClientIp,
  getRateLimitHeaders,
  acquireDistributedLock,
  releaseDistributedLock,
} from '../../../lib/rate-limit';
import { apiError, apiSuccess } from '../../../lib/response';
import { logSecurityEvent } from '../../../lib/security-logger';

const SHEETS_LOCK_KEY = 'lock:google_sheets_sync';

/**
 * Executa uma operação com retries automáticos e Exponential Backoff para erros de quota (429)
 */
async function withExponentialBackoff<T>(fn: () => Promise<T>, maxRetries = 3, initialDelayMs = 1000): Promise<T> {
  let delay = initialDelayMs;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      const isRateLimit =
        error instanceof Error &&
        (error.message.includes('429') ||
          error.message.includes('quota') ||
          error.message.includes('Rate Limit'));

      if (isRateLimit && attempt < maxRetries) {
        console.warn(`[GoogleSheets] Quota atingida. Tentativa ${attempt} de ${maxRetries}. Aguardando ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2; // Dobra o tempo a cada tentativa (Exponential Backoff)
        continue;
      }
      throw error;
    }
  }
  throw new Error('Falha após múltiplas tentativas com exponential backoff.');
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const userAgent = request.headers.get('user-agent');

  // 1. Verificação de Autenticação e RBAC (Requer OPERATOR ou superior)
  const auth = validateAuth(request, { requiredRole: 'OPERATOR' });
  if (!auth.authenticated) {
    await logSecurityEvent({
      event: 'AUTH_FAILED',
      route: '/api/sheets',
      ip,
      userAgent,
      details: auth.error,
    });
    return apiError(auth.error || 'Acesso não autorizado.', 401);
  }

  // 2. Verificação de Rate Limit (15 requisições por minuto)
  const rateLimit = await checkRateLimit(request, 'sheets', { limit: 15, windowMs: 60_000 });
  const rateLimitHeaders = getRateLimitHeaders(rateLimit);

  if (!rateLimit.success) {
    await logSecurityEvent({
      event: 'RATE_LIMIT_EXCEEDED',
      route: '/api/sheets',
      ip,
      userAgent,
    });
    return apiError(
      'Limite de requisições para sincronização excedido. Aguarde antes de tentar novamente.',
      429,
      { headers: rateLimitHeaders }
    );
  }

  // 3. Trava de Concorrência Distribuída (TTL 30s)
  const { acquired, lockId } = await acquireDistributedLock(SHEETS_LOCK_KEY, 30);
  if (!acquired) {
    return apiError(
      'Uma sincronização de planilha já está em andamento. Aguarde a conclusão.',
      409,
      { headers: rateLimitHeaders }
    );
  }

  const { GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_SHEET_ID } = process.env;

  if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY || !GOOGLE_SHEET_ID) {
    await releaseDistributedLock(SHEETS_LOCK_KEY, lockId);
    return apiError('Credenciais de integração do Google Sheets não configuradas no servidor.', 500, {
      headers: rateLimitHeaders,
    });
  }

  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });

    const cleanPrivateKey = GOOGLE_PRIVATE_KEY.replace(/^"|"$/g, '').replace(/\\n/g, '\n');

    const authClient = new google.auth.GoogleAuth({
      credentials: {
        client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: cleanPrivateKey,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth: authClient });

    const rows = logs.map((log) => [
      log.sku,
      `${log.erp} un`,
      `${log.mkt} un`,
      log.failure,
      log.status,
    ]);

    // Execução com Exponential Backoff contra erros de quota
    await withExponentialBackoff(async () => {
      await sheets.spreadsheets.values.clear({
        spreadsheetId: GOOGLE_SHEET_ID,
        range: 'Auditoria!A2:Z',
      });

      if (rows.length > 0) {
        await sheets.spreadsheets.values.append({
          spreadsheetId: GOOGLE_SHEET_ID,
          range: 'Auditoria!A2',
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: rows },
        });
      }
    });

    return apiSuccess({ count: rows.length }, { headers: rateLimitHeaders });
  } catch (error: unknown) {
    console.error('Erro na sincronização com Google Sheets:', error);

    let errorMessage = 'Falha ao sincronizar dados com o Google Sheets.';
    let statusCode = 500;

    if (error instanceof Error) {
      if (error.message.includes('403') || error.message.includes('permission')) {
        errorMessage = 'Permissão negada. O e-mail da Service Account precisa de acesso de Editor na planilha.';
        statusCode = 403;
      } else if (error.message.includes('404') || error.message.includes('not found')) {
        errorMessage = 'Planilha ou aba "Auditoria" não encontrada no Google Drive.';
        statusCode = 404;
      } else if (error.message.includes('429') || error.message.includes('quota')) {
        errorMessage = 'Quota de requisições do Google Sheets atingida. Tente novamente em alguns minutos.';
        statusCode = 429;
      }
    }

    await logSecurityEvent({
      event: 'SHEETS_SYNC_FAILED',
      route: '/api/sheets',
      ip,
      userAgent,
      details: errorMessage,
    });

    return apiError(errorMessage, statusCode, { headers: rateLimitHeaders });
  } finally {
    // Garante que o lock seja liberado independentemente de erro ou sucesso
    await releaseDistributedLock(SHEETS_LOCK_KEY, lockId);
  }
}