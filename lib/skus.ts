// lib/skus.ts
import { prisma } from './prisma';

export interface SkuFilterOptions {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'ALL' | 'CRITICAL' | 'OK';
  divergence?: 'ALL' | 'DIVERGENT' | 'ACCURATE';
  sortBy?: 'sku' | 'erp' | 'mkt' | 'difference' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  userId?: string;
}

export interface SkuListItem {
  sku: string;
  erp: number;
  mkt: number;
  difference: number;
  status: string;
  failure: string;
  lastAuditedAt: Date;
  isFavorite: boolean;
  totalAuditsCount: number;
}

export async function getSkusList(options: SkuFilterOptions = {}) {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 15));
  const skip = (page - 1) * limit;
  const userId = options.userId || 'op_dashboard_01';

  // 1. Busca favoritos do usuário
  const userFavorites = await prisma.favoriteSku.findMany({
    where: { userId },
    select: { sku: true },
  });
  const favoriteSet = new Set(userFavorites.map((f) => f.sku));

  // 2. Busca todos os audit logs para agregação
  const whereClause: {
    sku?: { contains: string };
    status?: string;
    OR?: Array<{ sku?: { contains: string }; failure?: { contains: string } }>;
  } = {};

  if (options.search) {
    whereClause.OR = [
      { sku: { contains: options.search } },
      { failure: { contains: options.search } },
    ];
  }

  if (options.status && options.status !== 'ALL') {
    whereClause.status = options.status;
  }

  // Agrupa os logs por SKU pegando o registro mais recente
  const allMatchingLogs = await prisma.auditLog.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
  });

  const skuMap = new Map<string, SkuListItem>();
  allMatchingLogs.forEach((log) => {
    if (!skuMap.has(log.sku)) {
      skuMap.set(log.sku, {
        sku: log.sku,
        erp: log.erp,
        mkt: log.mkt,
        difference: Math.abs(log.erp - log.mkt),
        status: log.status,
        failure: log.failure,
        lastAuditedAt: log.createdAt,
        isFavorite: favoriteSet.has(log.sku),
        totalAuditsCount: 1,
      });
    } else {
      const existing = skuMap.get(log.sku)!;
      existing.totalAuditsCount += 1;
    }
  });

  let items = Array.from(skuMap.values());

  // Filtro de divergência
  if (options.divergence === 'DIVERGENT') {
    items = items.filter((item) => item.difference > 0 || item.status === 'CRITICAL');
  } else if (options.divergence === 'ACCURATE') {
    items = items.filter((item) => item.difference === 0 && item.status === 'OK');
  }

  // Ordenação
  const sortBy = options.sortBy || 'createdAt';
  const sortOrder = options.sortOrder || 'desc';
  items.sort((a, b) => {
    let comp = 0;
    if (sortBy === 'sku') comp = a.sku.localeCompare(b.sku);
    else if (sortBy === 'erp') comp = a.erp - b.erp;
    else if (sortBy === 'mkt') comp = a.mkt - b.mkt;
    else if (sortBy === 'difference') comp = a.difference - b.difference;
    else comp = new Date(a.lastAuditedAt).getTime() - new Date(b.lastAuditedAt).getTime();

    return sortOrder === 'asc' ? comp : -comp;
  });

  const total = items.length;
  const paginatedItems = items.slice(skip, skip + limit);

  return {
    items: paginatedItems,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

export async function getSkuDetails(sku: string, userId: string = 'op_dashboard_01') {
  const logs = await prisma.auditLog.findMany({
    where: { sku },
    orderBy: { createdAt: 'desc' },
  });

  if (logs.length === 0) {
    return null;
  }

  const latest = logs[0];
  const isFavorite = await prisma.favoriteSku.findUnique({
    where: {
      userId_sku: {
        userId,
        sku,
      },
    },
  });

  const criticalOccurrences = logs.filter((l) => l.status === 'CRITICAL').length;
  const okOccurrences = logs.filter((l) => l.status === 'OK').length;
  const totalAudits = logs.length;

  // Falhas recorrentes agrupadas
  const failureCountMap = new Map<string, number>();
  logs.forEach((l) => {
    if (l.failure && l.failure !== 'Nenhuma') {
      failureCountMap.set(l.failure, (failureCountMap.get(l.failure) || 0) + 1);
    }
  });

  const recurringFailures = Array.from(failureCountMap.entries()).map(([failure, count]) => ({
    failure,
    count,
  }));

  return {
    sku,
    current: {
      erp: latest.erp,
      mkt: latest.mkt,
      difference: Math.abs(latest.erp - latest.mkt),
      status: latest.status,
      lastFailure: latest.failure,
      lastAuditedAt: latest.createdAt,
    },
    isFavorite: Boolean(isFavorite),
    metrics: {
      totalAudits,
      criticalOccurrences,
      okOccurrences,
      integrityRate: totalAudits > 0 ? Number((((totalAudits - criticalOccurrences) / totalAudits) * 100).toFixed(1)) : 100,
    },
    recurringFailures,
    history: logs.map((l) => ({
      id: l.id,
      eventId: l.eventId,
      erp: l.erp,
      mkt: l.mkt,
      difference: Math.abs(l.erp - l.mkt),
      failure: l.failure,
      status: l.status,
      createdAt: l.createdAt,
    })),
  };
}
