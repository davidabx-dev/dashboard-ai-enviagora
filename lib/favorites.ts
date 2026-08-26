// lib/favorites.ts
import { prisma } from './prisma';

export interface FavoriteItemDetails {
  id: string;
  sku: string;
  erp: number;
  mkt: number;
  difference: number;
  status: string;
  failure: string;
  createdAt: Date;
  lastAuditedAt: Date;
}

export async function getUserFavorites(userId: string): Promise<FavoriteItemDetails[]> {
  const favorites = await prisma.favoriteSku.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  if (favorites.length === 0) return [];

  const skus = favorites.map((f) => f.sku);
  const logs = await prisma.auditLog.findMany({
    where: { sku: { in: skus } },
    orderBy: { createdAt: 'desc' },
  });

  const latestLogBySku = new Map<string, typeof logs[0]>();
  logs.forEach((log) => {
    if (!latestLogBySku.has(log.sku)) {
      latestLogBySku.set(log.sku, log);
    }
  });

  return favorites.map((fav) => {
    const latest = latestLogBySku.get(fav.sku);
    return {
      id: fav.id,
      sku: fav.sku,
      erp: latest ? latest.erp : 0,
      mkt: latest ? latest.mkt : 0,
      difference: latest ? Math.abs(latest.erp - latest.mkt) : 0,
      status: latest ? latest.status : 'OK',
      failure: latest ? latest.failure : 'Nenhuma divergência registrada',
      createdAt: fav.createdAt,
      lastAuditedAt: latest ? latest.createdAt : fav.createdAt,
    };
  });
}

export async function addFavoriteSku(userId: string, sku: string) {
  return await prisma.favoriteSku.upsert({
    where: {
      userId_sku: {
        userId,
        sku,
      },
    },
    update: {},
    create: {
      userId,
      sku,
    },
  });
}

export async function removeFavoriteSku(userId: string, sku: string) {
  try {
    return await prisma.favoriteSku.delete({
      where: {
        userId_sku: {
          userId,
          sku,
        },
      },
    });
  } catch {
    return null;
  }
}
