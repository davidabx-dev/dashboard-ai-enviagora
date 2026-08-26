// lib/logs.ts
import { prisma } from './prisma';

export interface LogFilterOptions {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: 'createdAt' | 'sku' | 'erp' | 'mkt' | 'status';
  sortOrder?: 'asc' | 'desc';
}

export async function getLogsList(options: LogFilterOptions = {}) {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(200, Math.max(1, options.limit || 20));
  const skip = (page - 1) * limit;

  const whereClause: {
    status?: string;
    createdAt?: { gte?: Date; lte?: Date };
    OR?: Array<{ sku?: { contains: string }; failure?: { contains: string }; eventId?: { contains: string } }>;
  } = {};

  if (options.status && options.status !== 'ALL') {
    whereClause.status = options.status;
  }

  if (options.startDate || options.endDate) {
    whereClause.createdAt = {};
    if (options.startDate) {
      whereClause.createdAt.gte = new Date(options.startDate);
    }
    if (options.endDate) {
      whereClause.createdAt.lte = new Date(options.endDate);
    }
  }

  if (options.search) {
    whereClause.OR = [
      { sku: { contains: options.search } },
      { failure: { contains: options.search } },
      { eventId: { contains: options.search } },
    ];
  }

  const sortBy = options.sortBy || 'createdAt';
  const sortOrder = options.sortOrder || 'desc';

  const [total, logs] = await prisma.$transaction([
    prisma.auditLog.count({ where: whereClause }),
    prisma.auditLog.findMany({
      where: whereClause,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
  ]);

  return {
    logs: logs.map((l) => ({
      id: l.id,
      eventId: l.eventId,
      sku: l.sku,
      erp: l.erp,
      mkt: l.mkt,
      difference: Math.abs(l.erp - l.mkt),
      failure: l.failure,
      status: l.status,
      createdAt: l.createdAt,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

export async function getLogById(id: string) {
  const log = await prisma.auditLog.findUnique({
    where: { id },
  });

  if (!log) return null;

  return {
    id: log.id,
    eventId: log.eventId,
    sku: log.sku,
    erp: log.erp,
    mkt: log.mkt,
    difference: Math.abs(log.erp - log.mkt),
    failure: log.failure,
    status: log.status,
    createdAt: log.createdAt,
  };
}
