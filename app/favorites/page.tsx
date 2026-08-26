// app/favorites/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Star,
  Boxes,
  AlertCircle,
  Package,
  FileDown,
  RefreshCw,
  ArrowUpRight,
  Trash2,
} from 'lucide-react';

import { Sidebar } from '../../components/layout/Sidebar';
import { Header } from '../../components/layout/Header';
import { StatCard } from '../../components/shared/StatCard';
import { SkeletonLoader } from '../../components/shared/SkeletonLoader';
import { EmptyState } from '../../components/shared/EmptyState';
import { FavoriteItemDetails } from '../../lib/favorites';
import { generateFuturisticPDF } from '../../lib/pdf-generator';

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<FavoriteItemDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingSku, setDeletingSku] = useState<string | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);

  const fetchFavorites = useCallback(async () => {
    try {
      const res = await fetch('/api/favorites');
      const json = await res.json();
      if (json.success && json.data) {
        setFavorites(json.data);
      } else {
        setError(json.error || 'Falha ao carregar favoritos.');
      }
    } catch {
      setError('Erro ao comunicar com o servidor.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleManualRefresh = async () => {
    setLoading(true);
    setError(null);
    await fetchFavorites();
  };

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const res = await fetch('/api/favorites');
        const json = await res.json();
        if (isMounted) {
          if (json.success && json.data) {
            setFavorites(json.data);
          } else {
            setError(json.error || 'Falha ao carregar favoritos.');
          }
        }
      } catch {
        if (isMounted) setError('Erro ao comunicar com o servidor.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleRemoveFavorite = async (sku: string) => {
    setDeletingSku(sku);
    try {
      const res = await fetch(`/api/favorites/${encodeURIComponent(sku)}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        setFavorites((prev) => prev.filter((item) => item.sku !== sku));
      }
    } catch (err) {
      console.error('Erro ao remover favorito:', err);
    } finally {
      setDeletingSku(null);
    }
  };

  const handleExportPDF = async () => {
    if (favorites.length === 0) return;
    setExportingPdf(true);
    try {
      const rows = favorites.map((item) => [
        item.sku,
        `${item.erp} un`,
        `${item.mkt} un`,
        `${item.difference} un`,
        item.failure,
        item.status,
      ]);

      const doc = await generateFuturisticPDF({
        title: 'Relatório de Produtos Favoritos Monitorados',
        subtitle: `Total: ${favorites.length} Itens com Monitoramento Contínuo • Enviagora AI`,
        type: 'GENERAL_AUDIT',
        stats: [
          {
            label: 'Total de Favoritos',
            value: favorites.length,
            subtext: 'SKUs em lista de vigilância',
            variant: 'emerald',
          },
          {
            label: 'Críticos na Lista',
            value: favorites.filter((f) => f.status === 'CRITICAL').length,
            subtext: 'Itens com quebra de estoque',
            variant: 'rose',
          },
          {
            label: 'Conciliados 100%',
            value: favorites.filter((f) => f.status === 'OK').length,
            subtext: 'Estoque físico alinhado',
            variant: 'emerald',
          },
        ],
        columns: [
          { header: 'Código SKU', widthRatio: 0.18 },
          { header: 'Estoque ERP', widthRatio: 0.12 },
          { header: 'Marketplace', widthRatio: 0.14 },
          { header: 'Diferença', widthRatio: 0.14 },
          { header: 'Última Divergência', widthRatio: 0.28 },
          { header: 'Status', widthRatio: 0.14 },
        ],
        rows,
      });

      doc.save(`produtos-favoritos-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error('Erro ao exportar PDF de favoritos:', err);
    } finally {
      setExportingPdf(false);
    }
  };

  const criticalFavoritesCount = favorites.filter((f) => f.status === 'CRITICAL').length;
  const totalErpInFavs = favorites.reduce((acc, f) => acc + f.erp, 0);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#020703] font-sans antialiased text-white">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10 relative">
        <Header
          title="PRODUTOS"
          highlightWord="FAVORITOS"
          badgeText="WATCHLIST V2.4"
          subtitle="Lista de Vigilância Prioritária de SKUs com Monitoramento em Tempo Real"
          actions={
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportPDF}
                disabled={exportingPdf || loading || favorites.length === 0}
                className="flex items-center gap-2 bg-neutral-900/80 hover:bg-neutral-800 border border-emerald-500/20 hover:border-emerald-500/40 text-neutral-200 px-3.5 h-9 rounded-xl text-xs font-semibold transition-all disabled:opacity-35 disabled:pointer-events-none cursor-pointer"
              >
                {exportingPdf ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                ) : (
                  <FileDown className="w-3.5 h-3.5 text-emerald-400" />
                )}
                <span>{exportingPdf ? 'Exportando...' : 'Exportar PDF'}</span>
              </button>

              <button
                onClick={handleManualRefresh}
                disabled={loading}
                className="flex items-center justify-center w-9 h-9 rounded-xl bg-neutral-900/80 border border-emerald-500/20 hover:border-emerald-500/40 text-neutral-300 hover:text-white transition-all cursor-pointer"
                title="Atualizar Dados"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
              </button>
            </div>
          }
        />

        {loading ? (
          <SkeletonLoader rows={6} />
        ) : error ? (
          <EmptyState
            icon={AlertCircle}
            title="Erro ao Carregar Favoritos"
            description={error}
            actionText="Tentar Novamente"
            onActionClick={fetchFavorites}
          />
        ) : favorites.length === 0 ? (
          <EmptyState
            icon={Star}
            title="Sua Lista de Favoritos Está Vazia"
            description="Você ainda não marcou nenhum SKU para monitoramento prioritário. Navegue até o Controle de SKUs e clique na estrela de qualquer item para fixá-lo aqui."
            actionText="Explorar Controle de SKUs"
            actionHref="/skus"
          />
        ) : (
          <>
            {/* Grid de StatCards dos Favoritos */}
            <section className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
              <StatCard
                title="Total de Favoritos"
                value={favorites.length}
                subtitle="SKUs em vigilância prioritária"
                icon={Star}
                variant="emerald"
                badge="WATCHLIST"
              />

              <StatCard
                title="Alertas Críticos na Lista"
                value={criticalFavoritesCount}
                subtitle={criticalFavoritesCount > 0 ? 'Exigem ação operacional' : 'Nenhum alerta crítico'}
                icon={AlertCircle}
                variant={criticalFavoritesCount > 0 ? 'rose' : 'emerald'}
              />

              <StatCard
                title="Volume em Estoque ERP"
                value={`${totalErpInFavs.toLocaleString('pt-BR')} un`}
                subtitle="Soma do estoque físico monitorado"
                icon={Package}
                variant="emerald"
              />
            </section>

            {/* Tabela de Produtos Favoritos */}
            <section className="relative overflow-hidden rounded-2xl bg-[#08120a]/85 border border-emerald-500/20 shadow-2xl backdrop-blur-md mb-8">
              <div className="p-5 border-b border-emerald-500/15 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" /> SKUs em Monitoramento Prioritário
                  </h3>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Conciliação contínua e status em tempo real
                  </p>
                </div>

                <Link
                  href="/skus"
                  className="text-xs font-bold text-[#22c55e] hover:text-emerald-300 flex items-center gap-1 transition-colors"
                >
                  <Boxes className="w-3.5 h-3.5" /> Adicionar Mais SKUs
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-emerald-500/20 text-neutral-400 bg-emerald-950/30">
                      <th className="py-3.5 px-4 font-bold">Código SKU</th>
                      <th className="py-3.5 px-4 font-bold">Estoque ERP</th>
                      <th className="py-3.5 px-4 font-bold">Marketplace</th>
                      <th className="py-3.5 px-4 font-bold">Diferença</th>
                      <th className="py-3.5 px-4 font-bold">Última Divergência</th>
                      <th className="py-3.5 px-4 font-bold text-center">Status</th>
                      <th className="py-3.5 px-4 font-bold text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-500/10 text-neutral-200">
                    {favorites.map((item) => (
                      <tr key={item.sku} className="hover:bg-emerald-500/5 transition-colors">
                        <td className="py-3.5 px-4 font-black text-[#22c55e]">{item.sku}</td>
                        <td className="py-3.5 px-4 font-bold text-white">{item.erp} un</td>
                        <td className="py-3.5 px-4 font-bold text-white">{item.mkt} un</td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`font-black ${
                              item.difference > 0 ? 'text-rose-400' : 'text-emerald-400'
                            }`}
                          >
                            {item.difference > 0 ? `-${item.difference} un` : '0 un'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-neutral-400 max-w-xs truncate font-medium">
                          {item.failure}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              item.status === 'CRITICAL'
                                ? 'bg-rose-950/70 text-rose-400 border border-rose-500/40'
                                : 'bg-emerald-950/70 text-[#22c55e] border border-emerald-500/40'
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/skus/${encodeURIComponent(item.sku)}`}
                              className="inline-flex items-center gap-1 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/30 text-emerald-300 px-3 py-1 rounded-lg text-xs font-bold transition-all"
                            >
                              Auditar <ArrowUpRight className="w-3.5 h-3.5" />
                            </Link>

                            <button
                              onClick={() => handleRemoveFavorite(item.sku)}
                              disabled={deletingSku === item.sku}
                              className="p-1.5 rounded-lg bg-neutral-900/80 hover:bg-rose-950/60 border border-neutral-800 hover:border-rose-500/40 text-neutral-400 hover:text-rose-400 transition-all cursor-pointer"
                              title="Remover da lista de favoritos"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
