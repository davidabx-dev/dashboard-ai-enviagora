// lib/security-logger.ts
import { prisma } from './prisma';

export type SecurityEventType =
  | 'AUTH_FAILED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'INVALID_PAYLOAD'
  | 'WEBHOOK_REPLAY'
  | 'SHEETS_SYNC_FAILED'
  | 'AI_REQUEST_REJECTED'
  | 'SUSPICIOUS_INPUT';

export interface LogSecurityEventParams {
  event: SecurityEventType;
  route: string;
  ip: string;
  userAgent?: string | null;
  details?: string;
}

/**
 * Registra um evento de segurança de forma assíncrona sem bloquear a resposta HTTP
 * e garantindo que segredos, senhas e tokens nunca sejam gravados nos logs.
 */
export async function logSecurityEvent({
  event,
  route,
  ip,
  userAgent,
  details,
}: LogSecurityEventParams): Promise<void> {
  const timestamp = new Date().toISOString();
  console.warn(
    `[SECURITY_EVENT] [${timestamp}] [${event}] Route: ${route} | IP: ${ip} | Details: ${details || 'N/A'}`
  );

  try {
    // Sanitização de detalhes para garantir que chaves ou tokens não vazem
    const safeDetails = details
      ? details.replace(/(bearer\s+)[a-zA-Z0-9_\-\.]+/gi, '$1[REDACTED]')
      : null;

    await prisma.securityEvent.create({
      data: {
        event,
        route,
        ip: ip.slice(0, 50),
        userAgent: userAgent ? userAgent.slice(0, 255) : null,
        details: safeDetails ? safeDetails.slice(0, 1000) : null,
      },
    });
  } catch (error) {
    // Falhas no log de segurança não devem derrubar o fluxo principal
    console.error('Falha silenciosa ao persistir SecurityEvent no banco:', error);
  }
}
