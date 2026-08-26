// app/skus/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Search,
  Star,
  ArrowUpRight,
  ArrowUpDown,
  FileDown,
  RefreshCw,
  AlertCircle,
  Package,
} from 'lucide-react';

import { Sidebar } from '../../components/layout/Sidebar';
import { Header } from '../../components/layout/Header';
import { SkeletonLoader } from '../../components/shared/SkeletonLoader';
import { EmptyState } from '../../components/shared/EmptyState';
import { PaginationControls } from '../../components/shared/PaginationControls';
import { SkuListItem } from '../../lib/skus';
import { generateFuturisticPDF } from '../../lib/pdf-generator';

export default function SkusPage() {
  const [skus, setSkus] = useState<SkuListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CRITICAL' | 'OK'>('ALL');
  const [divergenceFilter, setDivergenceFilter] = useState<'ALL' | 'DIVERGENT' | 'ACCURATE'>('ALL');
  const [sortBy, setSortBy] = useState<'createdAt' | 'sku' | 'erp' | 'mkt' | 'difference'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [exportingPdf, setExportingPdf] = useState(false);
  const [togglingFav, setTogglingFav] = useState<string | null>(null);

  const fetchSkus = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '15',
        status: statusFilter,
        divergence: divergenceFilter,
        sortBy,
        sortOrder,
      });
      if (search.trim()) params.set('search', search.trim());

      const res = await fetch(`/api/skus?${params.toString()}`);
      const data = await res.json();

      if (data.success && data.items) {
        setSkus(data.items);
        setTotalPages(data.pagination.totalPages);
        setTotalItems(data.pagination.total);
      } else {
        setError(data.error || 'Falha ao carregar listagem de SKUs.');
      }
    } catch {
      setError('Erro de rede ao consultar controle de SKUs.');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, divergenceFilter, sortBy, sortOrder]);

  const handleManualRefresh = async () => {
    setLoading(true);
    setError(null);
    await fetchSkus();
  };

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: '15',
          status: statusFilter,
          divergence: divergenceFilter,
          sortBy,
          sortOrder,
        });
        if (search.trim()) params.set('search', search.trim());

        const res = await fetch(`/api/skus?${params.toString()}`);
        const data = await res.json();

        if (isMounted) {
          if (data.success && data.items) {
            setSkus(data.items);
            setTotalPages(data.pagination.totalPages);
            setTotalItems(data.pagination.total);
          } else {
            setError(data.error || 'Falha ao carregar listagem de SKUs.');
          }
        }
      } catch {
        if (isMounted) setError('Erro de rede ao consultar controle de SKUs.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [page, search, statusFilter, divergenceFilter, sortBy, sortOrder]);

  const handleToggleFavorite = async (sku: string, currentFav: boolean) => {
    setTogglingFav(sku);
    try {
      if (currentFav) {
        await fetch(`/api/favorites/${encodeURIComponent(sku)}`, { method: 'DELETE' });
      } else {
        await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sku }),
        });
      }

      setSkus((prev) =>
        prev.map((item) => (item.sku === sku ? { ...item, isFavorite: !currentFav } : item))
      );
    } catch (err) {
      console.error('Erro ao atualizar favorito:', err);
    } finally {
      setTogglingFav(null);
    }
  };

  const handleExportPDF = async () => {
    if (skus.length === 0) return;
    setExportingPdf(true);
    try {
      const rows = skus.map((item) => [
        item.sku,
        `${item.erp} un`,
        `${item.mkt} un`,
        `${item.difference} un`,
        item.failure,
        item.status,
      ]);

      const doc = await generateFuturisticPDF({
        title: 'Controle Corporativo de SKUs Auditados',
        subtitle: `Total Listado: ${totalItems} SKUs • Filtro: ${statusFilter} • Enviagora AI`,
        type: 'GENERAL_AUDIT',
        stats: [
          {
            label: 'Total de SKUs',
            value: totalItems,
            subtext: 'Registros na visualização',
            variant: 'emerald',
          },
          {
            label: 'Página Atual',
            value: `${page} de ${totalPages}`,
            subtext: `${skus.length} itens nesta folha`,
            variant: 'emerald',
          },
          {
            label: 'Filtro Aplicado',
            value: divergenceFilter,
            subtext: statusFilter === 'ALL' ? 'Todos os Status' : statusFilter,
            variant: statusFilter === 'CRITICAL' ? 'rose' : 'emerald',
          },
        ],
        columns: [
          { header: 'Código SKU', widthRatio: 0.18 },
          { header: 'ERP', widthRatio: 0.12 },
          { header: 'Marketplace', widthRatio: 0.14 },
          { header: 'Diferença', widthRatio: 0.14 },
          { header: 'Natureza da Falha', widthRatio: 0.28 },
          { header: 'Status', widthRatio: 0.14 },
        ],
        rows,
      });

      doc.save(`controle-skus-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error('Erro ao exportar PDF:', err);
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#020703] font-sans antialiased text-white">
      {/* Barra Lateral */}
      <Sidebar />

      {/* Área Principal */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10 relative">
        <Header
          title="CONTROLE DE"
          highlightWord="SKUS"
          badgeText="INVENTORY V2.4"
          subtitle="Auditoria Paginada, Conciliação ERP × Marketplaces e Análise Forense por Item"
          actions={
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportPDF}
                disabled={exportingPdf || loading || skus.length === 0}
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

        {/* Barra de Busca e Filtros */}
        <section className="flex flex-col gap-4 mb-6 p-4 rounded-2xl bg-[#08120a]/85 border border-emerald-500/20 shadow-xl backdrop-blur-md">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            {/* Campo de Busca */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
              <input
                type="text"
                placeholder="Pesquisar por SKU ou texto da falha..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-[#050e07] border border-emerald-500/20 focus:border-emerald-500/60 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-neutral-500 outline-none transition-all"
              />
            </div>

            {/* Filtros em Pílulas */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Status */}
              <div className="flex items-center gap-1 bg-[#050e07] p-1 rounded-xl border border-emerald-500/20">
                {(
                  [
                    { id: 'ALL', label: 'Todos' },
                    { id: 'CRITICAL', label: 'Críticos' },
                    { id: 'OK', label: 'OK' },
                  ] as const
                ).map((st) => (
                  <button
                    key={st.id}
                    onClick={() => {
                      setStatusFilter(st.id);
                      setPage(1);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                      statusFilter === st.id
                        ? 'bg-emerald-950/90 text-[#22c55e] border border-emerald-500/60 shadow-[0_0_8px_rgba(34,197,94,0.3)]'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>

              {/* Divergência */}
              <div className="flex items-center gap-1 bg-[#050e07] p-1 rounded-xl border border-emerald-500/20">
                {(
                  [
                    { id: 'ALL', label: 'Todos' },
                    { id: 'DIVERGENT', label: 'Com Divergência' },
                    { id: 'ACCURATE', label: '100% Conciliado' },
                  ] as const
                ).map((d) => (
                  <button
                    key={d.id}
                    onClick={() => {
                      setDivergenceFilter(d.id);
                      setPage(1);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                      divergenceFilter === d.id
                        ? 'bg-emerald-950/90 text-[#22c55e] border border-emerald-500/60 shadow-[0_0_8px_rgba(34,197,94,0.3)]'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>

              {/* Ordenação */}
              <div className="flex items-center gap-1 bg-[#050e07] px-2.5 py-1 rounded-xl border border-emerald-500/20 text-xs">
                <ArrowUpDown className="w-3.5 h-3.5 text-[#22c55e]" />
                <select
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [field, order] = e.target.value.split('-');
                    setSortBy(field as typeof sortBy);
                    setSortOrder(order as typeof sortOrder);
                    setPage(1);
                  }}
                  className="bg-transparent text-neutral-300 font-semibold outline-none cursor-pointer"
                >
                  <option value="createdAt-desc" className="bg-[#08140a]">Mais Recentes</option>
                  <option value="createdAt-asc" className="bg-[#08140a]">Mais Antigos</option>
                  <option value="difference-desc" className="bg-[#08140a]">Maior Diferença</option>
                  <option value="sku-asc" className="bg-[#08140a]">SKU (A-Z)</option>
                  <option value="erp-desc" className="bg-[#08140a]">Maior Estoque ERP</option>
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* Tabela de SKUs */}
        {loading ? (
          <SkeletonLoader rows={8} />
        ) : error ? (
          <EmptyState
            icon={AlertCircle}
            title="Erro na Consulta"
            description={error}
            actionText="Tentar Novamente"
            onActionClick={fetchSkus}
          />
        ) : skus.length === 0 ? (
          <EmptyState
            icon={Package}
            title="Nenhum SKU Encontrado"
            description="Nenhum registro corresponde aos filtros ou termo de busca informado."
            actionText="Limpar Filtros"
            onActionClick={() => {
              setSearch('');
              setStatusFilter('ALL');
              setDivergenceFilter('ALL');
            }}
          />
        ) : (
          <div className="relative overflow-hidden rounded-2xl bg-[#08120a]/85 border border-emerald-500/20 shadow-2xl backdrop-blur-md mb-8">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-emerald-500/20 text-neutral-400 bg-emerald-950/30">
                    <th className="py-3.5 px-4 font-bold">Favorito</th>
                    <th className="py-3.5 px-4 font-bold">Código SKU</th>
                    <th className="py-3.5 px-4 font-bold">Estoque ERP</th>
                    <th className="py-3.5 px-4 font-bold">Marketplace</th>
                    <th className="py-3.5 px-4 font-bold">Diferença</th>
                    <th className="py-3.5 px-4 font-bold">Natureza da Falha</th>
                    <th className="py-3.5 px-4 font-bold text-center">Status</th>
                    <th className="py-3.5 px-4 font-bold text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-500/10 text-neutral-200">
                  {skus.map((item) => (
                    <tr key={item.sku} className="hover:bg-emerald-500/5 transition-colors group">
                      {/* Botão Favorito */}
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleToggleFavorite(item.sku, item.isFavorite)}
                          disabled={togglingFav === item.sku}
                          className="p-1 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
                          title={item.isFavorite ? 'Remover dos Favoritos' : 'Adicionar aos Favoritos'}
                        >
                          <Star
                            className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                              item.isFavorite
                                ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]'
                                : 'text-neutral-600 hover:text-neutral-400'
                            }`}
                          />
                        </button>
                      </td>

                      {/* Código SKU */}
                      <td className="py-3 px-4 font-black text-[#22c55e]">{item.sku}</td>

                      {/* ERP */}
                      <td className="py-3 px-4 font-bold text-white">{item.erp} un</td>

                      {/* Marketplace */}
                      <td className="py-3 px-4 font-bold text-white">{item.mkt} un</td>

                      {/* Diferença */}
                      <td className="py-3 px-4">
                        <span
                          className={`font-black ${
                            item.difference > 0 ? 'text-rose-400' : 'text-emerald-400'
                          }`}
                        >
                          {item.difference > 0 ? `-${item.difference} un` : '0 un'}
                        </span>
                      </td>

                      {/* Falha */}
                      <td className="py-3 px-4 text-neutral-400 max-w-xs truncate font-medium">
                        {item.failure}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            item.status === 'CRITICAL'
                              ? 'bg-rose-950/70 text-rose-400 border border-rose-500/40 shadow-[0_0_8px_rgba(244,63,94,0.3)]'
                              : 'bg-emerald-950/70 text-[#22c55e] border border-emerald-500/40 shadow-[0_0_8px_rgba(34,197,94,0.3)]'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>

                      {/* Ações */}
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/skus/${encodeURIComponent(item.sku)}`}
                          className="inline-flex items-center gap-1 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/30 text-emerald-300 px-3 py-1 rounded-lg text-xs font-bold transition-all"
                        >
                          Detalhes <ArrowUpRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            <PaginationControls
              currentPage={page}
              totalPages={totalPages}
              totalItems={totalItems}
              onPageChange={(newPage) => setPage(newPage)}
            />
          </div>
        )}
      </main>
    </div>
  );
}
