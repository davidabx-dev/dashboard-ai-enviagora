// lib/validations.ts
import { z } from 'zod';

/** Status válidos de auditoria */
export const AuditStatusEnum = z.enum(['OK', 'CRITICAL'] as const);

/** Níveis de severidade de análise de IA */
export const SeverityEnum = z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const);

/** Schema estrito para o payload do Webhook com suporte a Idempotência (eventId) */
export const WebhookPayloadSchema = z
  .object({
    eventId: z
      .string()
      .trim()
      .min(1, 'eventId não pode estar vazio se informado.')
      .max(100, 'eventId não pode exceder 100 caracteres.')
      .optional(),
    sku: z
      .string()
      .trim()
      .min(1, 'O SKU não pode estar vazio.')
      .max(100, 'O SKU deve ter no máximo 100 caracteres.'),
    erp: z
      .number()
      .int('A quantidade ERP deve ser um número inteiro.')
      .min(0, 'A quantidade ERP não pode ser negativa.')
      .max(1_000_000, 'A quantidade ERP excede o limite permitido (1.000.000).'),
    mkt: z
      .number()
      .int('A quantidade MKT deve ser um número inteiro.')
      .min(0, 'A quantidade MKT não pode ser negativa.')
      .max(1_000_000, 'A quantidade MKT excede o limite permitido (1.000.000).'),
    failure: z
      .string()
      .trim()
      .min(1, 'A descrição da falha não pode estar vazia.')
      .max(500, 'A descrição da falha deve ter no máximo 500 caracteres.'),
    status: AuditStatusEnum.default('CRITICAL'),
  })
  .strict();

export type WebhookPayload = z.infer<typeof WebhookPayloadSchema>;

/** Schema para cada item enviado para análise no James Engine */
export const AuditItemSchema = z.object({
  id: z.string().optional(),
  sku: z.string().trim().min(1).max(100),
  erp: z.number().int().min(0).max(1_000_000),
  mkt: z.number().int().min(0).max(1_000_000),
  failure: z.string().trim().min(1).max(500),
  status: z.string().trim().min(1).max(50),
});

/** Schema para a requisição de /api/analyze com limites estritos */
export const AnalyzePayloadSchema = z.object({
  dataset: z
    .array(AuditItemSchema)
    .min(1, 'O dataset deve conter pelo menos 1 registro para análise.')
    .max(100, 'O dataset não pode conter mais de 100 registros por requisição de IA.'),
});

export type AnalyzePayload = z.infer<typeof AnalyzePayloadSchema>;

/** Schema de Saída Estruturada do James Engine (IA) */
export const FindingItemSchema = z.object({
  sku: z.string().max(100),
  issue: z.string().max(500),
  recommendation: z.string().max(500),
});

export const AnalyzeResponseSchema = z.object({
  severity: SeverityEnum,
  summary: z.string().min(1).max(3000),
  criticalCount: z.number().int().min(0),
  findings: z.array(FindingItemSchema).max(50),
  recommendations: z.array(z.string().max(500)).max(20),
});

export type AnalyzeResponse = z.infer<typeof AnalyzeResponseSchema>;
