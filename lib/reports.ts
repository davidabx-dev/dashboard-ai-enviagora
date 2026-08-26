// lib/reports.ts
import { prisma } from './prisma';

export interface CreateReportInput {
  userId: string;
  type: 'GENERAL_AUDIT' | 'CRITICAL_ISSUES' | 'SKU_HISTORY' | 'EXECUTIVE_SUMMARY';
  title: string;
  filters?: Record<string, unknown>;
  recordCount: number;
  format?: 'PDF' | 'SHEETS' | 'CSV';
}

export async function getUserReports(userId: string) {
  return await prisma.exportedReport.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createExportedReport(input: CreateReportInput) {
  return await prisma.exportedReport.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      filters: input.filters ? JSON.stringify(input.filters) : null,
      recordCount: input.recordCount,
      format: input.format || 'PDF',
    },
  });
}

export async function getReportById(id: string, userId: string) {
  return await prisma.exportedReport.findFirst({
    where: {
      id,
      userId,
    },
  });
}
