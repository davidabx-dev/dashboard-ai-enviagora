// app/logs/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  FileText,
  Search,
  ArrowUpDown,
  FileDown,
  RefreshCw,
  AlertCircle,
  Eye,
  X,
  Copy,
  Check,
  ShieldCheck,
} from 'lucide-react';

import { Sidebar } from '../../components/layout/Sidebar';
import { Header } from '../../components/layout/Header';
import { SkeletonLoader } from '../../components/shared/SkeletonLoader';
import { EmptyState } from '../../components/shared/EmptyState';
import { PaginationControls } from '../../components/shared/PaginationControls';
import { generateFuturisticPDF } from '../../lib/pdf-generator';

interface LogItem {
  id: string;
  eventId?: string;
  sku: string;
  erp: number;
  mkt: number;
  difference: number;
  failure: string;
  status: string;
  createdAt: string;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CRITICAL' | 'OK'>('ALL');
  const [dateRange, setDateRange] = useState<'today' | '7d' | '30d' | 'all'>('all');
  const [sortBy, setSortBy] = useState<'createdAt' | 'sku' | 'erp' | 'mkt'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [selectedLog, setSelectedLog] = useState<LogItem | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);

  const fetchLogs = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
        sortBy,
        sortOrder,
      });

      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (search.trim()) params.set('search', search.trim());

      const now = new Date();
      if (dateRange === 'today') {
        const startOfToday = new Date(now.setHours(0, 0, 0, 0));
        params.set('startDate', startOfToday.toISOString());
      } else if (dateRange === '7d') {
        const d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        params.set('startDate', d.toISOString());
      } else if (dateRange === '30d') {
        const d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        params.set('startDate', d.toISOString());
      }

      const res = await fetch(`/api/logs?${params.toString()}`);
      const data = await res.json();

      if (data.success && data.logs) {
        setLogs(data.logs);
        setTotalPages(data.pagination.totalPages);
        setTotalItems(data.pagination.total);
      } else {
        setError(data.error || 'Falha ao consultar logs.');
      }
    } catch {
      setError('Erro de rede ao consultar logs.');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, dateRange, sortBy, sortOrder]);

  const handleManualRefresh = async () => {
    setLoading(true);
    setError(null);
    await fetchLogs();
  };

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: '20',
          sortBy,
          sortOrder,
        });

        if (statusFilter !== 'ALL') params.set('status', statusFilter);
        if (search.trim()) params.set('search', search.trim());

        const now = new Date();
        if (dateRange === 'today') {
          const startOfToday = new Date(now.setHours(0, 0, 0, 0));
          params.set('startDate', startOfToday.toISOString());
        } else if (dateRange === '7d') {
          const d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          params.set('startDate', d.toISOString());
        } else if (dateRange === '30d') {
          const d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          params.set('startDate', d.toISOString());
        }

        const res = await fetch(`/api/logs?${params.toString()}`);
        const data = await res.json();

        if (isMounted) {
          if (data.success && data.logs) {
            setLogs(data.logs);
            setTotalPages(data.pagination.totalPages);
            setTotalItems(data.pagination.total);
          } else {
            setError(data.error || 'Falha ao consultar logs.');
          }
        }
      } catch {
        if (isMounted) setError('Erro de rede ao consultar logs.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [page, search, statusFilter, dateRange, sortBy, sortOrder]);

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleExportPDF = async () => {
    if (logs.length === 0) return;
    setExportingPdf(true);
    try {
      const rows = logs.map((l) => [
        new Date(l.createdAt).toLocaleString('pt-BR'),
        l.sku,
        `${l.erp} un`,
        `${l.mkt} un`,
        l.failure,
        l.status,
      ]);

      const doc = await generateFuturisticPDF({
        title: 'Histórico Executivo de Logs de Auditoria',
        subtitle: `Total Registrado: ${totalItems} Logs • Filtro: ${statusFilter} • Enviagora AI`,
        type: 'GENERAL_AUDIT',
        stats: [
          {
            label: 'Total de Logs',
            value: totalItems,
            subtext: 'Registros armazenados',
            variant: 'emerald',
          },
          {
            label: 'Página Atual',
            value: `${page} de ${totalPages}`,
            subtext: `${logs.length} logs nesta folha`,
            variant: 'emerald',
          },
          {
            label: 'Filtro de Status',
            value: statusFilter === 'ALL' ? 'Todos' : statusFilter,
            subtext: dateRange.toUpperCase(),
            variant: statusFilter === 'CRITICAL' ? 'rose' : 'emerald',
          },
        ],
        columns: [
          { header: 'Data & Hora', widthRatio: 0.18 },
          { header: 'Código SKU', widthRatio: 0.15 },
          { header: 'Estoque ERP', widthRatio: 0.12 },
          { header: 'Marketplace', widthRatio: 0.12 },
          { header: 'Falha Registrada', widthRatio: 0.28 },
          { header: 'Status', widthRatio: 0.15 },
        ],
        rows,
      });

      doc.save(`historico-logs-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error('Erro ao exportar PDF de logs:', err);
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#020703] font-sans antialiased text-white">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10 relative">
        <Header
          title="HISTÓRICO DE"
          highlightWord="LOGS"
          badgeText="AUDIT TRAIL V2.4"
          subtitle="Trilha Criptograficamente Auditável de Eventos, Webhooks e Conciliação Operacional"
          actions={
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportPDF}
                disabled={exportingPdf || loading || logs.length === 0}
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

        {/* Filtros e Busca */}
        <section className="flex flex-col gap-4 mb-6 p-4 rounded-2xl bg-[#08120a]/85 border border-emerald-500/20 shadow-xl backdrop-blur-md">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
              <input
                type="text"
                placeholder="Pesquisar por SKU, Event ID ou descrição da falha..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-[#050e07] border border-emerald-500/20 focus:border-emerald-500/60 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-neutral-500 outline-none transition-all"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Intervalo de Data */}
              <div className="flex items-center gap-1 bg-[#050e07] p-1 rounded-xl border border-emerald-500/20">
                {(
                  [
                    { id: 'today', label: 'Hoje' },
                    { id: '7d', label: '7 Dias' },
                    { id: '30d', label: '30 Dias' },
                    { id: 'all', label: 'Todos' },
                  ] as const
                ).map((dr) => (
                  <button
                    key={dr.id}
                    onClick={() => {
                      setDateRange(dr.id);
                      setPage(1);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                      dateRange === dr.id
                        ? 'bg-emerald-950/90 text-[#22c55e] border border-emerald-500/60 shadow-[0_0_8px_rgba(34,197,94,0.3)]'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    {dr.label}
                  </button>
                ))}
              </div>

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
                  <option value="sku-asc" className="bg-[#08140a]">SKU (A-Z)</option>
                  <option value="erp-desc" className="bg-[#08140a]">Maior Estoque ERP</option>
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* Tabela de Logs */}
        {loading ? (
          <SkeletonLoader rows={10} />
        ) : error ? (
          <EmptyState
            icon={AlertCircle}
            title="Erro na Consulta"
            description={error}
            actionText="Tentar Novamente"
            onActionClick={fetchLogs}
          />
        ) : logs.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Nenhum Log Registrado"
            description="Não encontramos registros de auditoria com os critérios selecionados."
            actionText="Limpar Filtros"
            onActionClick={() => {
              setSearch('');
              setStatusFilter('ALL');
              setDateRange('all');
            }}
          />
        ) : (
          <div className="relative overflow-hidden rounded-2xl bg-[#08120a]/85 border border-emerald-500/20 shadow-2xl backdrop-blur-md mb-8">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-emerald-500/20 text-neutral-400 bg-emerald-950/30">
                    <th className="py-3.5 px-4 font-bold">Data & Hora</th>
                    <th className="py-3.5 px-4 font-bold">Código SKU</th>
                    <th className="py-3.5 px-4 font-bold">Estoque ERP</th>
                    <th className="py-3.5 px-4 font-bold">Marketplace</th>
                    <th className="py-3.5 px-4 font-bold">Diferença</th>
                    <th className="py-3.5 px-4 font-bold">Falha Operacional</th>
                    <th className="py-3.5 px-4 font-bold text-center">Status</th>
                    <th className="py-3.5 px-4 font-bold text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-500/10 text-neutral-200">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-emerald-500/5 transition-colors group">
                      <td className="py-3 px-4 text-neutral-400 font-medium whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString('pt-BR')}
                      </td>
                      <td className="py-3 px-4 font-black text-[#22c55e]">{log.sku}</td>
                      <td className="py-3 px-4 font-bold text-white">{log.erp} un</td>
                      <td className="py-3 px-4 font-bold text-white">{log.mkt} un</td>
                      <td className="py-3 px-4">
                        <span
                          className={`font-black ${
                            log.difference > 0 ? 'text-rose-400' : 'text-emerald-400'
                          }`}
                        >
                          {log.difference > 0 ? `-${log.difference} un` : '0 un'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-neutral-400 max-w-xs truncate font-medium">
                        {log.failure}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            log.status === 'CRITICAL'
                              ? 'bg-rose-950/70 text-rose-400 border border-rose-500/40 shadow-[0_0_8px_rgba(244,63,94,0.3)]'
                              : 'bg-emerald-950/70 text-[#22c55e] border border-emerald-500/40 shadow-[0_0_8px_rgba(34,197,94,0.3)]'
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="inline-flex items-center gap-1 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/30 text-emerald-300 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" /> Inspecionar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <PaginationControls
              currentPage={page}
              totalPages={totalPages}
              totalItems={totalItems}
              onPageChange={(newPage) => setPage(newPage)}
            />
          </div>
        )}

        {/* Modal de Inspeção Forense do Log */}
        {selectedLog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="relative w-full max-w-2xl rounded-2xl bg-[#061108] border border-emerald-500/40 shadow-2xl p-6 overflow-hidden">
              <div className="flex items-center justify-between pb-4 border-b border-emerald-500/20 mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-[#22c55e]">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">Inspeção Forense do Log</h3>
                    <p className="text-xs text-neutral-400 font-mono">ID: {selectedLog.id}</p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedLog(null)}
                  className="p-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Detalhes do Log */}
              <div className="grid grid-cols-2 gap-4 mb-4 text-xs">
                <div className="p-3 rounded-xl bg-[#040a06] border border-emerald-500/15">
                  <span className="text-neutral-500 block mb-1 font-semibold">Código SKU</span>
                  <span className="text-sm font-black text-[#22c55e]">{selectedLog.sku}</span>
                </div>

                <div className="p-3 rounded-xl bg-[#040a06] border border-emerald-500/15">
                  <span className="text-neutral-500 block mb-1 font-semibold">Data & Hora</span>
                  <span className="text-sm font-bold text-white">
                    {new Date(selectedLog.createdAt).toLocaleString('pt-BR')}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#040a06] border border-emerald-500/15">
                  <span className="text-neutral-500 block mb-1 font-semibold">Estoque ERP</span>
                  <span className="text-sm font-bold text-white">{selectedLog.erp} unidades</span>
                </div>

                <div className="p-3 rounded-xl bg-[#040a06] border border-emerald-500/15">
                  <span className="text-neutral-500 block mb-1 font-semibold">Marketplace</span>
                  <span className="text-sm font-bold text-white">{selectedLog.mkt} unidades</span>
                </div>
              </div>

              {/* Falha e Payload Sanitizado */}
              <div className="space-y-3 mb-6 text-xs">
                <div className="p-3 rounded-xl bg-[#040a06] border border-emerald-500/15">
                  <span className="text-neutral-500 block mb-1 font-semibold">Falha Identificada</span>
                  <p className="text-rose-400 font-semibold">{selectedLog.failure}</p>
                </div>

                <div className="p-3 rounded-xl bg-[#040a06] border border-emerald-500/15">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-neutral-500 font-semibold">Payload Operacional</span>
                    <button
                      onClick={() => handleCopy(JSON.stringify(selectedLog, null, 2), 'payload')}
                      className="text-[11px] text-[#22c55e] hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedField === 'payload' ? (
                        <>
                          <Check className="w-3 h-3" /> Copiado!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" /> Copiar JSON
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-2.5 rounded-lg bg-black/60 font-mono text-[11px] text-emerald-300/90 overflow-x-auto">
                    {JSON.stringify(
                      {
                        id: selectedLog.id,
                        eventId: selectedLog.eventId || 'WEBHOOK_EVENT_DEFAULT',
                        sku: selectedLog.sku,
                        erp: selectedLog.erp,
                        mkt: selectedLog.mkt,
                        difference: selectedLog.difference,
                        failure: selectedLog.failure,
                        status: selectedLog.status,
                        createdAt: selectedLog.createdAt,
                      },
                      null,
                      2
                    )}
                  </pre>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-emerald-500/15">
                <Link
                  href={`/skus/${encodeURIComponent(selectedLog.sku)}`}
                  className="px-4 py-2 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-bold hover:bg-emerald-900/60 transition-all"
                >
                  Abrir Página do SKU
                </Link>

                <button
                  onClick={() => setSelectedLog(null)}
                  className="px-4 py-2 rounded-xl bg-[#22c55e] text-black text-xs font-black hover:bg-[#1ea850] transition-all cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
