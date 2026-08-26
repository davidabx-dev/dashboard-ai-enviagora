// lib/metrics.ts
import { prisma } from './prisma';

export interface MetricsFilterOptions {
  period?: '7d' | '30d' | '90d' | 'all';
  status?: 'ALL' | 'CRITICAL' | 'OK';
  sku?: string;
}

export interface MetricSummary {
  totalSkus: number;
  totalAudits: number;
  totalDiscrepancies: number;
  criticalDiscrepancies: number;
  resolvedDiscrepancies: number;
  accuracyRate: number;
  timeline: {
    name: string;
    date: string;
    auditorias: number;
    divergencias: number;
    criticas: number;
  }[];
  statusDistribution: {
    name: string;
    count: number;
    percentage: number;
    color: string;
  }[];
  stockComparison: {
    totalErp: number;
    totalMkt: number;
    netDifference: number;
  };
  ranking: {
    sku: string;
    divergencesCount: number;
    latestErp: number;
    latestMkt: number;
    latestFailure: string;
    status: string;
    lastAuditedAt: Date;
  }[];
}

export async function calculateMetrics(options: MetricsFilterOptions = {}): Promise<MetricSummary> {
  const period = options.period || '30d';
  const status = options.status || 'ALL';

  let dateFilter: Date | undefined;
  const now = new Date();
  if (period === '7d') {
    dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (period === '30d') {
    dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  } else if (period === '90d') {
    dateFilter = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  }

  const whereClause: {
    createdAt?: { gte: Date };
    status?: string;
    sku?: { contains: string };
  } = {};

  if (dateFilter) {
    whereClause.createdAt = { gte: dateFilter };
  }
  if (status && status !== 'ALL') {
    whereClause.status = status;
  }
  if (options.sku) {
    whereClause.sku = { contains: options.sku };
  }

  // Busca todos os logs relevantes do período
  const logs = await prisma.auditLog.findMany({
    where: whereClause,
    orderBy: { createdAt: 'asc' },
  });

  const totalAudits = logs.length;
  const criticalCount = logs.filter((l) => l.status === 'CRITICAL').length;
  const okCount = logs.filter((l) => l.status === 'OK').length;
  const discrepanciesCount = logs.filter((l) => l.erp !== l.mkt).length;

  const uniqueSkus = new Set(logs.map((l) => l.sku));
  const totalSkus = uniqueSkus.size;
  const accuracyRate = totalAudits > 0 ? Number((((totalAudits - criticalCount) / totalAudits) * 100).toFixed(1)) : 100.0;

  // 1. Distribuição de Status
  const statusDistribution = [
    {
      name: 'CRITICAL',
      count: criticalCount,
      percentage: totalAudits > 0 ? Number(((criticalCount / totalAudits) * 100).toFixed(1)) : 0,
      color: '#ef4444',
    },
    {
      name: 'OK / VÁLIDO',
      count: okCount,
      percentage: totalAudits > 0 ? Number(((okCount / totalAudits) * 100).toFixed(1)) : 0,
      color: '#22c55e',
    },
  ];

  // 2. Comparativo de Estoque Total
  const totalErp = logs.reduce((acc, l) => acc + l.erp, 0);
  const totalMkt = logs.reduce((acc, l) => acc + l.mkt, 0);
  const netDifference = Math.abs(totalErp - totalMkt);

  // 3. Linha do Tempo / Evolução Temporal
  const timelineMap = new Map<string, { auditorias: number; divergencias: number; criticas: number }>();
  logs.forEach((log) => {
    const dayKey = log.createdAt.toISOString().split('T')[0];
    const cur = timelineMap.get(dayKey) || { auditorias: 0, divergencias: 0, criticas: 0 };
    cur.auditorias += 1;
    if (log.erp !== log.mkt) cur.divergencias += 1;
    if (log.status === 'CRITICAL') cur.criticas += 1;
    timelineMap.set(dayKey, cur);
  });

  const timeline = Array.from(timelineMap.entries()).map(([dateStr, stats]) => {
    const d = new Date(dateStr);
    const label = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    return {
      name: label,
      date: dateStr,
      auditorias: stats.auditorias,
      divergencias: stats.divergencias,
      criticas: stats.criticas,
    };
  });

  // 4. Ranking de SKUs mais problemáticos
  const skuStatsMap = new Map<
    string,
    {
      divergencesCount: number;
      latestErp: number;
      latestMkt: number;
      latestFailure: string;
      status: string;
      lastAuditedAt: Date;
    }
  >();

  logs.forEach((log) => {
    const cur = skuStatsMap.get(log.sku) || {
      divergencesCount: 0,
      latestErp: log.erp,
      latestMkt: log.mkt,
      latestFailure: log.failure,
      status: log.status,
      lastAuditedAt: log.createdAt,
    };

    if (log.erp !== log.mkt || log.status === 'CRITICAL') {
      cur.divergencesCount += 1;
    }
    cur.latestErp = log.erp;
    cur.latestMkt = log.mkt;
    cur.latestFailure = log.failure;
    cur.status = log.status;
    cur.lastAuditedAt = log.createdAt;
    skuStatsMap.set(log.sku, cur);
  });

  const ranking = Array.from(skuStatsMap.entries())
    .map(([sku, data]) => ({
      sku,
      ...data,
    }))
    .sort((a, b) => b.divergencesCount - a.divergencesCount)
    .slice(0, 5);

  return {
    totalSkus,
    totalAudits,
    totalDiscrepancies: discrepanciesCount,
    criticalDiscrepancies: criticalCount,
    resolvedDiscrepancies: okCount,
    accuracyRate,
    timeline,
    statusDistribution,
    stockComparison: {
      totalErp,
      totalMkt,
      netDifference,
    },
    ranking,
  };
}
