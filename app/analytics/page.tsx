// app/analytics/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  TrendingUp,
  Boxes,
  AlertCircle,
  ShieldCheck,
  Package,
  FileDown,
  RefreshCw,
  Calendar,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

import { Sidebar } from '../../components/layout/Sidebar';
import { Header } from '../../components/layout/Header';
import { StatCard } from '../../components/shared/StatCard';
import { SkeletonLoader } from '../../components/shared/SkeletonLoader';
import { EmptyState } from '../../components/shared/EmptyState';
import { MetricSummary } from '../../lib/metrics';
import { generateFuturisticPDF } from '../../lib/pdf-generator';

export default function AnalyticsPage() {
  const [metrics, setMetrics] = useState<MetricSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CRITICAL' | 'OK'>('ALL');
  const [exportingPdf, setExportingPdf] = useState(false);

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await fetch(`/api/metrics?period=${period}&status=${statusFilter}`);
      const data = await res.json();
      if (data.success && data.data) {
        setMetrics(data.data);
      } else {
        setError(data.error || 'Falha ao carregar métricas analíticas.');
      }
    } catch {
      setError('Erro de rede ao consultar servidor de auditoria.');
    } finally {
      setLoading(false);
    }
  }, [period, statusFilter]);

  const handleManualRefresh = async () => {
    setLoading(true);
    setError(null);
    await fetchMetrics();
  };

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const res = await fetch(`/api/metrics?period=${period}&status=${statusFilter}`);
        const data = await res.json();
        if (isMounted) {
          if (data.success && data.data) {
            setMetrics(data.data);
          } else {
            setError(data.error || 'Falha ao carregar métricas analíticas.');
          }
        }
      } catch {
        if (isMounted) setError('Erro de rede ao consultar servidor de auditoria.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [period, statusFilter]);

  const handleExportReport = async () => {
    if (!metrics) return;
    setExportingPdf(true);
    try {
      const rows = metrics.ranking.map((r) => [
        r.sku,
        `${r.latestErp} un`,
        `${r.latestMkt} un`,
        r.latestFailure,
        r.status,
      ]);

      const doc = await generateFuturisticPDF({
        title: 'Relatório Analítico de Performance Logística',
        subtitle: `Período: ${period.toUpperCase()} • Taxa de SLA: ${metrics.accuracyRate}% • Enviagora AI`,
        type: 'EXECUTIVE_SUMMARY',
        stats: [
          {
            label: 'Total de SKUs',
            value: metrics.totalSkus,
            subtext: `${metrics.totalAudits} auditorias no período`,
            variant: 'emerald',
          },
          {
            label: 'Divergências Críticas',
            value: metrics.criticalDiscrepancies,
            subtext: 'Alertas detectados',
            variant: 'rose',
          },
          {
            label: 'Taxa de Integridade',
            value: `${metrics.accuracyRate}%`,
            subtext: 'Meta de SLA Operacional',
            variant: 'emerald',
          },
        ],
        columns: [
          { header: 'Código SKU', widthRatio: 0.2 },
          { header: 'Estoque ERP', widthRatio: 0.15 },
          { header: 'Marketplace', widthRatio: 0.15 },
          { header: 'Causa da Divergência', widthRatio: 0.35 },
          { header: 'Status', widthRatio: 0.15 },
        ],
        rows,
      });

      doc.save(`relatorio-analitico-${period}-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error('Erro ao exportar PDF analítico:', err);
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
          title="MÉTRICAS &"
          highlightWord="ANÁLISES"
          badgeText="ANALYTICS ENGINE V2.4"
          subtitle="Visão Consolidada de Inteligência Operacional, SLAs e Discrepâncias de Estoque"
          actions={
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportReport}
                disabled={exportingPdf || loading || !metrics}
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

        {/* Barra de Filtros de Período e Status */}
        <section className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 p-4 rounded-2xl bg-[#08120a]/80 border border-emerald-500/20 backdrop-blur-md">
          {/* Seletor de Período */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-neutral-400 flex items-center gap-1.5 mr-1">
              <Calendar className="w-3.5 h-3.5 text-[#22c55e]" /> Período:
            </span>
            {(
              [
                { id: '7d', label: '7 Dias' },
                { id: '30d', label: '30 Dias' },
                { id: '90d', label: '90 Dias' },
                { id: 'all', label: 'Histórico Total' },
              ] as const
            ).map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  period === p.id
                    ? 'bg-emerald-950/80 text-[#22c55e] border border-emerald-500/60 shadow-[0_0_12px_rgba(34,197,94,0.25)]'
                    : 'bg-neutral-900/60 text-neutral-400 border border-neutral-800 hover:text-white hover:border-emerald-500/30'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Filtro de Status */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-neutral-400 flex items-center gap-1.5 mr-1">
              <Layers className="w-3.5 h-3.5 text-[#22c55e]" /> Status:
            </span>
            {(
              [
                { id: 'ALL', label: 'Todos' },
                { id: 'CRITICAL', label: 'Críticos' },
                { id: 'OK', label: 'OK' },
              ] as const
            ).map((s) => (
              <button
                key={s.id}
                onClick={() => setStatusFilter(s.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  statusFilter === s.id
                    ? 'bg-emerald-950/80 text-[#22c55e] border border-emerald-500/60 shadow-[0_0_12px_rgba(34,197,94,0.25)]'
                    : 'bg-neutral-900/60 text-neutral-400 border border-neutral-800 hover:text-white hover:border-emerald-500/30'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </section>

        {loading ? (
          <SkeletonLoader rows={6} />
        ) : error ? (
          <EmptyState
            icon={AlertCircle}
            title="Erro ao Carregar Métricas"
            description={error}
            actionText="Tentar Novamente"
            onActionClick={fetchMetrics}
          />
        ) : !metrics || metrics.totalAudits === 0 ? (
          <EmptyState
            icon={BarChart3}
            title="Nenhum Dado Encontrado"
            description="Não existem registros de auditoria para o período e filtros selecionados."
            actionText="Ver Todos os Registros"
            onActionClick={() => {
              setPeriod('all');
              setStatusFilter('ALL');
            }}
          />
        ) : (
          <>
            {/* Grid de 4 StatCards Principais */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
              <StatCard
                title="SKUs Monitorados"
                value={metrics.totalSkus}
                subtitle={`${metrics.totalAudits} checagens no período`}
                icon={Boxes}
                variant="emerald"
                badge="ATIVO"
              />

              <StatCard
                title="Alertas Críticos"
                value={metrics.criticalDiscrepancies}
                subtitle="Quebras de estoque pendentes"
                icon={AlertCircle}
                variant="rose"
                badge="ATENÇÃO"
              />

              <StatCard
                title="Acurácia Geral"
                value={`${metrics.accuracyRate}%`}
                subtitle="Meta de SLA: >98.0%"
                icon={ShieldCheck}
                variant="emerald"
                badge="SLA"
              />

              <StatCard
                title="Estoque ERP Total"
                value={`${metrics.stockComparison.totalErp.toLocaleString('pt-BR')} un`}
                subtitle={`Marketplace: ${metrics.stockComparison.totalMkt.toLocaleString('pt-BR')} un`}
                icon={Package}
                variant="emerald"
              />
            </section>

            {/* Seção de Gráficos (Evolução Temporal + Distribuição de Estoque) */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Gráfico 1: Evolução Temporal */}
              <div className="lg:col-span-2 relative overflow-hidden rounded-2xl bg-[#08120a]/85 p-6 border border-emerald-500/20 shadow-2xl backdrop-blur-md flex flex-col justify-between">
                <div className="flex items-center justify-between mb-6">
                  <p className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
                    <TrendingUp size={14} className="text-[#22c55e]" /> Evolução Temporal de Divergências
                  </p>
                  <span className="text-[10px] font-extrabold text-[#22c55e] bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-500/30">
                    Sincronização em Tempo Real
                  </span>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={metrics.timeline}>
                      <defs>
                        <linearGradient id="colorAudits" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorCrit" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.5} />
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#142418" />
                      <XAxis dataKey="name" stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                      <YAxis stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#061108',
                          borderColor: 'rgba(34,197,94,0.3)',
                          borderRadius: '12px',
                          color: '#fff',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="auditorias"
                        name="Auditorias Realizadas"
                        stroke="#22c55e"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorAudits)"
                      />
                      <Area
                        type="monotone"
                        dataKey="criticas"
                        name="Alertas Críticos"
                        stroke="#ef4444"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorCrit)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Gráfico 2: Comparativo ERP vs Marketplace */}
              <div className="relative overflow-hidden rounded-2xl bg-[#08120a]/85 p-6 border border-emerald-500/20 shadow-2xl backdrop-blur-md flex flex-col justify-between">
                <div>
                  <p className="text-xs font-bold text-neutral-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <BarChart3 size={14} className="text-[#22c55e]" /> Balanço ERP vs Marketplace
                  </p>
                  <p className="text-[11px] text-neutral-400 mb-4">
                    Comparativo volumétrico de unidades em estoque
                  </p>
                </div>

                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        {
                          name: 'Estoque Total',
                          ERP: metrics.stockComparison.totalErp,
                          Marketplace: metrics.stockComparison.totalMkt,
                        },
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#142418" />
                      <XAxis dataKey="name" stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                      <YAxis stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#061108',
                          borderColor: 'rgba(34,197,94,0.3)',
                          borderRadius: '12px',
                          color: '#fff',
                        }}
                      />
                      <Legend />
                      <Bar dataKey="ERP" fill="#22c55e" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="Marketplace" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="pt-3 border-t border-emerald-500/15 flex items-center justify-between text-xs">
                  <span className="text-neutral-400">Divergência Líquida:</span>
                  <span className="font-black text-rose-400">
                    {metrics.stockComparison.netDifference} unidades
                  </span>
                </div>
              </div>
            </section>

            {/* Tabela de Ranking dos SKUs mais Problemáticos */}
            <section className="relative overflow-hidden rounded-2xl bg-[#08120a]/85 border border-emerald-500/20 shadow-2xl backdrop-blur-md p-6 mb-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400" /> Ranking de SKUs com Maior Recorrência de Falhas
                  </h3>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Itens prioritários para conciliação operacional imediata
                  </p>
                </div>

                <Link
                  href="/skus"
                  className="text-xs font-bold text-[#22c55e] hover:text-emerald-300 flex items-center gap-1 transition-colors"
                >
                  Ver Todos os SKUs <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-emerald-500/20 text-neutral-400">
                      <th className="py-3 px-4 font-bold">Código SKU</th>
                      <th className="py-3 px-4 font-bold">Ocorrências</th>
                      <th className="py-3 px-4 font-bold">Estoque ERP</th>
                      <th className="py-3 px-4 font-bold">Marketplace</th>
                      <th className="py-3 px-4 font-bold">Última Divergência</th>
                      <th className="py-3 px-4 font-bold text-center">Status</th>
                      <th className="py-3 px-4 font-bold text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-500/10 text-neutral-200">
                    {metrics.ranking.map((item) => (
                      <tr key={item.sku} className="hover:bg-emerald-500/5 transition-colors">
                        <td className="py-3 px-4 font-black text-[#22c55e]">{item.sku}</td>
                        <td className="py-3 px-4 font-bold text-rose-400">
                          {item.divergencesCount} falhas
                        </td>
                        <td className="py-3 px-4 font-medium">{item.latestErp} un</td>
                        <td className="py-3 px-4 font-medium">{item.latestMkt} un</td>
                        <td className="py-3 px-4 text-neutral-400 font-medium max-w-xs truncate">
                          {item.latestFailure}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              item.status === 'CRITICAL'
                                ? 'bg-rose-950/70 text-rose-400 border border-rose-500/40 shadow-[0_0_8px_rgba(244,63,94,0.3)]'
                                : 'bg-emerald-950/70 text-[#22c55e] border border-emerald-500/40 shadow-[0_0_8px_rgba(34,197,94,0.3)]'
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Link
                            href={`/skus/${item.sku}`}
                            className="inline-flex items-center gap-1 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/30 text-emerald-300 px-3 py-1 rounded-lg text-[11px] font-bold transition-all"
                          >
                            Auditar <ArrowUpRight className="w-3 h-3" />
                          </Link>
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
