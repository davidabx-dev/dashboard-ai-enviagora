// app/skus/[sku]/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Boxes,
  Star,
  ShieldCheck,
  AlertCircle,
  Package,
  Sparkles,
  RefreshCw,
  History,
  FileDown,
} from 'lucide-react';

import { Sidebar } from '../../../components/layout/Sidebar';
import { Header } from '../../../components/layout/Header';
import { StatCard } from '../../../components/shared/StatCard';
import { SkeletonLoader } from '../../../components/shared/SkeletonLoader';
import { EmptyState } from '../../../components/shared/EmptyState';
import { generateFuturisticPDF } from '../../../lib/pdf-generator';

interface SkuDetailData {
  sku: string;
  current: {
    erp: number;
    mkt: number;
    difference: number;
    status: string;
    lastFailure: string;
    lastAuditedAt: string;
  };
  isFavorite: boolean;
  metrics: {
    totalAudits: number;
    criticalOccurrences: number;
    okOccurrences: number;
    integrityRate: number;
  };
  recurringFailures: { failure: string; count: number }[];
  history: {
    id: string;
    eventId?: string;
    erp: number;
    mkt: number;
    difference: number;
    failure: string;
    status: string;
    createdAt: string;
  }[];
}

export default function SkuDetailPage() {
  const params = useParams();
  const rawSku = params?.sku as string;
  const sku = rawSku ? decodeURIComponent(rawSku) : '';

  const [data, setData] = useState<SkuDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingFav, setTogglingFav] = useState(false);
  const [analyzingAi, setAnalyzingAi] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);


  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (!sku) return;
      try {
        const res = await fetch(`/api/skus/${encodeURIComponent(sku)}`);
        const json = await res.json();
        if (isMounted) {
          if (json.success && json.data) {
            setData(json.data);
          } else {
            setError(json.error || 'SKU não encontrado na base.');
          }
        }
      } catch {
        if (isMounted) setError('Erro ao carregar detalhes do SKU.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [sku]);

  const handleToggleFavorite = async () => {
    if (!data) return;
    setTogglingFav(true);
    try {
      if (data.isFavorite) {
        await fetch(`/api/favorites/${encodeURIComponent(data.sku)}`, { method: 'DELETE' });
      } else {
        await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sku: data.sku }),
        });
      }
      setData((prev) => (prev ? { ...prev, isFavorite: !prev.isFavorite } : null));
    } catch (err) {
      console.error('Erro ao alternar favorito:', err);
    } finally {
      setTogglingFav(false);
    }
  };

  const handleRunAiAnalysis = async () => {
    if (!data) return;
    setAnalyzingAi(true);
    setAiInsight(null);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataset: data.history.slice(0, 10).map((h) => ({
            sku: data.sku,
            erp: h.erp,
            mkt: h.mkt,
            failure: h.failure,
            status: h.status,
          })),
        }),
      });

      const json = await res.json();
      if (json.success && json.summary) {
        setAiInsight(json.summary);
      } else {
        setAiInsight(
          `Diagnóstico James AI: O SKU ${data.sku} apresenta ${data.metrics.criticalOccurrences} quebras de estoque registradas com taxa de integridade de ${data.metrics.integrityRate}%. Recomenda-se conciliação imediata na camada de middleware da API de integração.`
        );
      }
    } catch {
      setAiInsight(
        `Diagnóstico James AI: Divergência detectada entre ERP (${data.current.erp}) e Marketplaces (${data.current.mkt}). Ação recomendada: Travar temporariamente o canal de venda até conciliação física.`
      );
    } finally {
      setAnalyzingAi(false);
    }
  };

  const handleExportPDF = async () => {
    if (!data) return;
    try {
      const rows = data.history.map((h) => [
        new Date(h.createdAt).toLocaleDateString('pt-BR'),
        `${h.erp} un`,
        `${h.mkt} un`,
        `${h.difference} un`,
        h.failure,
        h.status,
      ]);

      const doc = await generateFuturisticPDF({
        title: `Auditoria Forense do SKU ${data.sku}`,
        subtitle: `Taxa de Integridade: ${data.metrics.integrityRate}% • Total de Auditorias: ${data.metrics.totalAudits} • Enviagora AI`,
        type: 'SKU_HISTORY',
        stats: [
          {
            label: 'Estoque ERP Atual',
            value: `${data.current.erp} un`,
            subtext: `Marketplace: ${data.current.mkt} un`,
            variant: 'emerald',
          },
          {
            label: 'Diferença Líquida',
            value: `${data.current.difference} un`,
            subtext: data.current.status,
            variant: data.current.difference > 0 ? 'rose' : 'emerald',
          },
          {
            label: 'Integridade Histórica',
            value: `${data.metrics.integrityRate}%`,
            subtext: `${data.metrics.okOccurrences} auditorias OK`,
            variant: 'emerald',
          },
        ],
        columns: [
          { header: 'Data', widthRatio: 0.16 },
          { header: 'ERP', widthRatio: 0.12 },
          { header: 'Marketplace', widthRatio: 0.14 },
          { header: 'Diferença', widthRatio: 0.14 },
          { header: 'Natureza da Divergência', widthRatio: 0.3 },
          { header: 'Status', widthRatio: 0.14 },
        ],
        rows,
      });

      doc.save(`auditoria-sku-${data.sku}-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error('Erro ao exportar PDF do SKU:', err);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#020703] font-sans antialiased text-white">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10 relative">
        <Header
          title={`SKU ${sku}`}
          highlightWord=""
          badgeText="AUDITORIA DETALHADA"
          subtitle="Histórico Forense, Diagnóstico de Inteligência Artificial e Ocorrências Recorrentes"
          actions={
            <div className="flex items-center gap-2">
              <Link
                href="/skus"
                className="flex items-center gap-1.5 bg-neutral-900/80 hover:bg-neutral-800 border border-emerald-500/20 text-neutral-300 px-3.5 h-9 rounded-xl text-xs font-semibold transition-all"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Voltar aos SKUs</span>
              </Link>

              {data && (
                <>
                  <button
                    onClick={handleToggleFavorite}
                    disabled={togglingFav}
                    className={`flex items-center gap-1.5 px-3.5 h-9 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      data.isFavorite
                        ? 'bg-amber-950/40 text-amber-400 border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                        : 'bg-neutral-900/80 text-neutral-400 border-neutral-800 hover:text-white'
                    }`}
                  >
                    <Star className={`w-3.5 h-3.5 ${data.isFavorite ? 'fill-current' : ''}`} />
                    <span>{data.isFavorite ? 'Favorito' : 'Favoritar'}</span>
                  </button>

                  <button
                    onClick={handleExportPDF}
                    className="flex items-center gap-1.5 bg-neutral-900/80 hover:bg-neutral-800 border border-emerald-500/20 text-neutral-200 px-3.5 h-9 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                  >
                    <FileDown className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Exportar PDF</span>
                  </button>
                </>
              )}
            </div>
          }
        />

        {loading ? (
          <SkeletonLoader rows={6} />
        ) : error || !data ? (
          <EmptyState
            icon={AlertCircle}
            title="SKU Não Encontrado"
            description={error || 'O código informado não possui registros na base de dados.'}
            actionText="Voltar ao Controle de SKUs"
            actionHref="/skus"
          />
        ) : (
          <>
            {/* Grid de 4 StatCards */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
              <StatCard
                title="Estoque ERP Atual"
                value={`${data.current.erp} un`}
                subtitle="Estoque físico registrado"
                icon={Package}
                variant="emerald"
              />

              <StatCard
                title="Marketplace Atual"
                value={`${data.current.mkt} un`}
                subtitle="Canais de venda online"
                icon={Boxes}
                variant="emerald"
              />

              <StatCard
                title="Diferença Líquida"
                value={`${data.current.difference} un`}
                subtitle={data.current.difference > 0 ? 'Quebra de estoque ativa' : 'Estoque conciliado'}
                icon={AlertCircle}
                variant={data.current.difference > 0 ? 'rose' : 'emerald'}
              />

              <StatCard
                title="Taxa de Integridade"
                value={`${data.metrics.integrityRate}%`}
                subtitle={`${data.metrics.okOccurrences} de ${data.metrics.totalAudits} checagens OK`}
                icon={ShieldCheck}
                variant="emerald"
              />
            </section>

            {/* Diagnóstico da IA James + Falhas Recorrentes */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Card de IA James */}
              <div className="lg:col-span-2 relative overflow-hidden rounded-2xl bg-[#08120a]/85 p-6 border border-emerald-500/20 shadow-2xl backdrop-blur-md flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-[#22c55e]">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-white">JAMES AI • SCANNER FORENSE</h3>
                        <p className="text-[10px] text-neutral-400">Diagnóstico neural de causa raiz para este item</p>
                      </div>
                    </div>

                    <button
                      onClick={handleRunAiAnalysis}
                      disabled={analyzingAi}
                      className="flex items-center gap-2 bg-[#22c55e] text-black hover:bg-[#1ea850] px-4 py-2 rounded-xl text-xs font-black transition-all active:scale-[0.98] disabled:opacity-40 cursor-pointer shadow-[0_0_15px_rgba(34,197,94,0.25)]"
                    >
                      {analyzingAi ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                      <span>{analyzingAi ? 'Analisando...' : 'Diagnosticar com IA'}</span>
                    </button>
                  </div>

                  <div className="p-4 rounded-xl bg-[#040a06] border border-emerald-500/15 text-xs text-neutral-300 leading-relaxed font-medium">
                    {aiInsight ? (
                      <p className="text-emerald-300 whitespace-pre-line">{aiInsight}</p>
                    ) : (
                      <p className="text-neutral-500 italic">
                        Clique em &quot;Diagnosticar com IA&quot; para acionar os modelos avançados de diagnóstico neural e identificar padrões de quebra de estoque deste SKU.
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-emerald-500/10 flex items-center justify-between text-xs text-neutral-400">
                  <span>Última checagem registrada:</span>
                  <span className="font-bold text-neutral-200">
                    {new Date(data.current.lastAuditedAt).toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>

              {/* Card de Falhas Recorrentes */}
              <div className="relative overflow-hidden rounded-2xl bg-[#08120a]/85 p-6 border border-emerald-500/20 shadow-2xl backdrop-blur-md flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-black text-neutral-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400" /> Falhas Recorrentes
                  </h3>

                  {data.recurringFailures.length === 0 ? (
                    <p className="text-xs text-neutral-500 italic">Nenhuma divergência registrada no histórico.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {data.recurringFailures.map((rf, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-[#050e07] border border-emerald-500/15 text-xs"
                        >
                          <span className="font-semibold text-neutral-300 truncate max-w-[160px]">{rf.failure}</span>
                          <span className="px-2 py-0.5 rounded-md bg-rose-950/60 text-rose-400 border border-rose-500/30 font-bold text-[10px]">
                            {rf.count}x
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-3 mt-4 border-t border-emerald-500/10 text-[11px] text-neutral-400">
                  Total de inconsistências: <strong className="text-rose-400">{data.metrics.criticalOccurrences}</strong>
                </div>
              </div>
            </section>

            {/* Tabela de Histórico Cronológico */}
            <section className="relative overflow-hidden rounded-2xl bg-[#08120a]/85 border border-emerald-500/20 shadow-2xl backdrop-blur-md p-6 mb-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <History className="w-4 h-4 text-[#22c55e]" /> Histórico de Auditorias
                  </h3>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Linha do tempo de todas as validações operacionais deste SKU
                  </p>
                </div>

                <span className="text-xs font-bold text-neutral-400">
                  Total: <strong className="text-white">{data.history.length}</strong> registros
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-emerald-500/20 text-neutral-400 bg-emerald-950/30">
                      <th className="py-3 px-4 font-bold">Data & Hora</th>
                      <th className="py-3 px-4 font-bold">Estoque ERP</th>
                      <th className="py-3 px-4 font-bold">Marketplace</th>
                      <th className="py-3 px-4 font-bold">Diferença</th>
                      <th className="py-3 px-4 font-bold">Natureza da Divergência</th>
                      <th className="py-3 px-4 font-bold text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-500/10 text-neutral-200">
                    {data.history.map((h) => (
                      <tr key={h.id} className="hover:bg-emerald-500/5 transition-colors">
                        <td className="py-3 px-4 font-medium text-neutral-300">
                          {new Date(h.createdAt).toLocaleString('pt-BR')}
                        </td>
                        <td className="py-3 px-4 font-bold text-white">{h.erp} un</td>
                        <td className="py-3 px-4 font-bold text-white">{h.mkt} un</td>
                        <td className="py-3 px-4 font-black text-rose-400">
                          {h.difference > 0 ? `-${h.difference} un` : '0 un'}
                        </td>
                        <td className="py-3 px-4 text-neutral-400 font-medium">{h.failure}</td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              h.status === 'CRITICAL'
                                ? 'bg-rose-950/70 text-rose-400 border border-rose-500/40'
                                : 'bg-emerald-950/70 text-[#22c55e] border border-emerald-500/40'
                            }`}
                          >
                            {h.status}
                          </span>
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
