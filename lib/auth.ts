// lib/auth.ts
import { createHmac, timingSafeEqual, randomBytes } from 'crypto';

export type UserRole = 'ADMIN' | 'OPERATOR' | 'VIEWER' | 'SERVICE_M2M';

interface AuthOptions {
  /** Se true, exige estritamente Authorization: Bearer <token> (ex: Webhook M2M) */
  requireBearer?: boolean;
  /** Nível mínimo de permissão exigido */
  requiredRole?: UserRole;
}

export interface AuthResult {
  authenticated: boolean;
  error?: string;
  authType?: 'bearer' | 'session';
  role?: UserRole;
  userId?: string;
}

const SESSION_COOKIE_NAME = 'enviagora_session';
const CSRF_HEADER_NAME = 'x-csrf-token';

const ROLE_HIERARCHY: Record<UserRole, number> = {
  ADMIN: 3,
  OPERATOR: 2,
  VIEWER: 1,
  SERVICE_M2M: 3,
};

function getAuthSecret(): string {
  return process.env.API_AUTH_TOKEN || 'enviagora-default-internal-secret-change-in-env';
}

/**
 * Cria um token de sessão assinado com HMAC-SHA256 contendo userId, role e expiração.
 * Protegido contra session fixation através da inclusão de um nonce aleatório por sessão.
 */
export function generateSessionToken(
  userId: string = 'op_dashboard_01',
  role: UserRole = 'OPERATOR'
): {
  sessionToken: string;
  csrfToken: string;
  expiresAt: number;
  role: UserRole;
  userId: string;
} {
  const secret = getAuthSecret();
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 horas
  const nonce = randomBytes(8).toString('hex');
  const payload = `session:${userId}:${role}:${expiresAt}:${nonce}`;
  const signature = createHmac('sha256', secret).update(payload).digest('hex');
  const sessionToken = `${payload}.${signature}`;

  // CSRF token derivado da assinatura da sessão
  const csrfToken = createHmac('sha256', secret).update(signature).digest('hex');

  return { sessionToken, csrfToken, expiresAt, role, userId };
}

/**
 * Valida a integridade e expiração de um token de sessão assinado
 */
export function verifySessionToken(sessionToken: string): {
  valid: boolean;
  userId?: string;
  role?: UserRole;
} {
  if (!sessionToken || !sessionToken.includes('.')) return { valid: false };

  const lastDotIndex = sessionToken.lastIndexOf('.');
  const payload = sessionToken.substring(0, lastDotIndex);
  const providedSignature = sessionToken.substring(lastDotIndex + 1);

  if (!payload || !providedSignature) return { valid: false };

  const secret = getAuthSecret();
  const expectedSignature = createHmac('sha256', secret).update(payload).digest('hex');

  try {
    const provBuffer = Buffer.from(providedSignature, 'utf-8');
    const expBuffer = Buffer.from(expectedSignature, 'utf-8');

    if (provBuffer.length !== expBuffer.length || !timingSafeEqual(provBuffer, expBuffer)) {
      return { valid: false };
    }

    const parts = payload.split(':');
    if (parts.length < 4) return { valid: false };

    const userId = parts[1];
    const role = (parts[2] as UserRole) || 'OPERATOR';
    const expiresAt = Number(parts[3]);

    if (isNaN(expiresAt) || Date.now() > expiresAt) {
      return { valid: false };
    }

    return { valid: true, userId, role };
  } catch {
    return { valid: false };
  }
}

/**
 * Extrai cookies do cabeçalho Cookie
 */
function parseCookies(cookieHeader: string | null): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;

  const pairs = cookieHeader.split(';');
  for (const pair of pairs) {
    const [name, ...rest] = pair.trim().split('=');
    if (name) {
      cookies[name] = decodeURIComponent(rest.join('='));
    }
  }
  return cookies;
}

/**
 * Validação rigorosa de autenticação e autorização (RBAC).
 */
export function validateAuth(request: Request, options: AuthOptions = {}): AuthResult {
  const configuredToken = process.env.API_AUTH_TOKEN;
  const authHeader = request.headers.get('authorization');

  // 1. Verificação de Bearer Token (M2M / Webhooks)
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const providedToken = authHeader.substring(7).trim();

    if (!configuredToken) {
      return {
        authenticated: false,
        error: 'API_AUTH_TOKEN não configurado no servidor.',
      };
    }

    try {
      const providedBuffer = Buffer.from(providedToken, 'utf-8');
      const configuredBuffer = Buffer.from(configuredToken, 'utf-8');

      if (
        providedBuffer.length === configuredBuffer.length &&
        timingSafeEqual(providedBuffer, configuredBuffer)
      ) {
        return {
          authenticated: true,
          authType: 'bearer',
          role: 'ADMIN',
          userId: 'service_m2m_token',
        };
      }
    } catch {
      return { authenticated: false, error: 'Credenciais inválidas.' };
    }

    return { authenticated: false, error: 'Token de autenticação inválido.' };
  }

  // Se a rota exige estritamente Bearer token (como Webhook externo)
  if (options.requireBearer) {
    return {
      authenticated: false,
      error: 'Cabeçalho Authorization: Bearer <token> é obrigatório para esta rota.',
    };
  }

  // 2. Verificação de Sessão via Cookie Seguro (Browser / Dashboard)
  const cookieHeader = request.headers.get('cookie');
  const cookies = parseCookies(cookieHeader);
  const sessionCookie = cookies[SESSION_COOKIE_NAME];

  if (sessionCookie) {
    const sessionCheck = verifySessionToken(sessionCookie);

    if (sessionCheck.valid) {
      const userRole = sessionCheck.role || 'OPERATOR';
      const userId = sessionCheck.userId || 'op_dashboard_01';

      // Validação de RBAC (Role-Based Access Control)
      if (options.requiredRole) {
        const userLevel = ROLE_HIERARCHY[userRole] || 0;
        const requiredLevel = ROLE_HIERARCHY[options.requiredRole] || 0;

        if (userLevel < requiredLevel) {
          return {
            authenticated: false,
            error: `Permissão insuficiente. Nível ${options.requiredRole} exigido.`,
          };
        }
      }

      // Para métodos mutáveis via browser (POST/PUT/DELETE), valida proteção CSRF se o header estiver presente
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        const csrfHeader = request.headers.get(CSRF_HEADER_NAME);
        const lastDot = sessionCookie.lastIndexOf('.');
        const sessionSignature = sessionCookie.substring(lastDot + 1);
        const expectedCsrf = createHmac('sha256', getAuthSecret()).update(sessionSignature).digest('hex');

        if (csrfHeader && csrfHeader !== expectedCsrf) {
          return { authenticated: false, error: 'Token CSRF inválido.' };
        }
      }

      return {
        authenticated: true,
        authType: 'session',
        role: userRole,
        userId,
      };
    }
  }

  return {
    authenticated: false,
    error: 'Acesso não autorizado. Sessão ativa ou Bearer Token obrigatório.',
  };
}

export { SESSION_COOKIE_NAME, CSRF_HEADER_NAME };
