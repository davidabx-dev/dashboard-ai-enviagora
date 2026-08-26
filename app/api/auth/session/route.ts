// app/api/auth/session/route.ts
import { generateSessionToken, SESSION_COOKIE_NAME, UserRole } from '../../../../lib/auth';
import { apiError, apiSuccess } from '../../../../lib/response';
import { timingSafeEqual } from 'crypto';

/**
 * Endpoint de Autenticação e Emissão de Sessão Segura.
 * 
 * Regras de Emissão de Perfil (Anti-Privilege Escalation):
 * 1. Sessões com perfil elevado (ADMIN / OPERATOR) exigem credencial válida (API_AUTH_TOKEN).
 * 2. Visitantes anônimos sem credencial recebem exclusivamente perfil 'VIEWER' (Read-Only).
 * 3. Qualquer tentativa de auto-atribuição de role elevado sem credencial é rejeitada (401).
 */
export async function POST(request: Request) {
  let requestedRole: UserRole = 'VIEWER';
  let userId = 'anonymous_viewer';
  let providedAuthToken: string | null = null;

  // Extrai token do header Authorization ou do body
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    providedAuthToken = authHeader.substring(7).trim();
  }

  try {
    const body = await request.json();
    if (body.role && ['ADMIN', 'OPERATOR', 'VIEWER'].includes(body.role)) {
      requestedRole = body.role as UserRole;
    }
    if (body.userId && typeof body.userId === 'string') {
      userId = body.userId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32);
    }
    if (body.authToken && typeof body.authToken === 'string') {
      providedAuthToken = body.authToken;
    }
  } catch {
    // Body opcional (handshake padrão de visitante anônimo)
  }

  const serverSecret = process.env.API_AUTH_TOKEN;

  // Validação de credencial para perfis elevados
  if (requestedRole === 'ADMIN' || requestedRole === 'OPERATOR') {
    if (!serverSecret || !providedAuthToken) {
      return apiError(
        'Credencial de autenticação obrigatória para obtenção de perfil elevado (ADMIN/OPERATOR).',
        401
      );
    }

    try {
      const provBuffer = Buffer.from(providedAuthToken, 'utf-8');
      const confBuffer = Buffer.from(serverSecret, 'utf-8');

      if (provBuffer.length !== confBuffer.length || !timingSafeEqual(provBuffer, confBuffer)) {
        return apiError('Credencial de autenticação inválida para o perfil solicitado.', 401);
      }
    } catch {
      return apiError('Falha na validação das credenciais.', 401);
    }
  }

  const { sessionToken, csrfToken, expiresAt, role } = generateSessionToken(userId, requestedRole);

  const response = apiSuccess({
    authenticated: true,
    userId,
    role,
    csrfToken,
    expiresAt,
    message: `Sessão estabelecida com sucesso para ${userId} com perfil ${role}.`,
  });

  // Configuração do cookie seguro HttpOnly
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: sessionToken,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 24 * 60 * 60, // 24 horas
  });

  return response;
}

export async function GET(request: Request) {
  return POST(request);
}

export async function DELETE() {
  const response = apiSuccess({
    authenticated: false,
    message: 'Sessão encerrada com sucesso.',
  });

  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  return response;
}
