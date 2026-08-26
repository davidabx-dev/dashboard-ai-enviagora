// app/reports/[id]/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  FileText,
  FileDown,
  RefreshCw,
  Clock,
  Layers,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';

import { Sidebar } from '../../../components/layout/Sidebar';
import { Header } from '../../../components/layout/Header';
import { StatCard } from '../../../components/shared/StatCard';
import { SkeletonLoader } from '../../../components/shared/SkeletonLoader';
import { EmptyState } from '../../../components/shared/EmptyState';
import { generateFuturisticPDF } from '../../../lib/pdf-generator';

interface ReportDetailData {
  id: string;
  userId: string;
  type: string;
  title: string;
  filters?: string | null;
  recordCount: number;
  format: string;
  createdAt: string;
}

export default function ReportDetailPage() {
  const params = useParams();
  const reportId = params?.id as string;

  const [report, setReport] = useState<ReportDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);


  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (!reportId) return;
      try {
        const res = await fetch(`/api/reports/${reportId}`);
        const json = await res.json();
        if (isMounted) {
          if (json.success && json.data) {
            setReport(json.data);
          } else {
            setError(json.error || 'Relatório não encontrado.');
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
  }, [reportId]);

  const handleDownload = async () => {
    if (!report) return;
    setDownloading(true);
    try {
      const logsRes = await fetch(`/api/logs?limit=${Math.min(report.recordCount || 20, 50)}`);
      const logsJson = await logsRes.json();
      const rowsData = logsJson.logs || [];

      const rows = rowsData.map((l: { createdAt: string; sku: string; erp: number; mkt: number; failure: string; status: string }) => [
        new Date(l.createdAt).toLocaleDateString('pt-BR'),
        l.sku,
        `${l.erp} un`,
        `${l.mkt} un`,
        l.failure,
        l.status,
      ]);

      const doc = await generateFuturisticPDF({
        title: report.title,
        subtitle: `Emitido originalmente em ${new Date(report.createdAt).toLocaleString('pt-BR')}`,
        type: report.type,
        columns: [
          { header: 'Data', widthRatio: 0.16 },
          { header: 'Código SKU', widthRatio: 0.16 },
          { header: 'Estoque ERP', widthRatio: 0.14 },
          { header: 'Marketplace', widthRatio: 0.14 },
          { header: 'Natureza da Divergência', widthRatio: 0.26 },
          { header: 'Status', widthRatio: 0.14 },
        ],
        rows,
      });

      doc.save(`relatorio-${report.title.toLowerCase().replace(/\s+/g, '-')}.pdf`);
    } catch (err) {
      console.error('Erro no download:', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#020703] font-sans antialiased text-white">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10 relative">
        <Header
          title="DETALHES DO"
          highlightWord="RELATÓRIO"
          badgeText="DOCUMENTO V2.4"
          subtitle="Metadados, Parâmetros e Download do Documento Executivo"
          actions={
            <div className="flex items-center gap-2">
              <Link
                href="/reports"
                className="flex items-center gap-1.5 bg-neutral-900/80 hover:bg-neutral-800 border border-emerald-500/20 text-neutral-300 px-3.5 h-9 rounded-xl text-xs font-semibold transition-all"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Voltar à Biblioteca</span>
              </Link>

              {report && (
                <button
                  onClick={handleDownload}
                  disabled={downloading}
                  className="flex items-center gap-2 bg-[#22c55e] text-black hover:bg-[#1ea850] px-4 h-9 rounded-xl text-xs font-black transition-all active:scale-[0.98] cursor-pointer shadow-[0_0_15px_rgba(34,197,94,0.3)] disabled:opacity-40"
                >
                  {downloading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
                  <span>{downloading ? 'Baixando...' : 'Baixar PDF'}</span>
                </button>
              )}
            </div>
          }
        />

        {loading ? (
          <SkeletonLoader rows={6} />
        ) : error || !report ? (
          <EmptyState
            icon={AlertCircle}
            title="Relatório Não Encontrado"
            description={error || 'O relatório solicitado não existe ou você não possui permissão para acessá-lo.'}
            actionText="Voltar à Biblioteca"
            actionHref="/reports"
          />
        ) : (
          <>
            {/* Grid de StatCards */}
            <section className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
              <StatCard
                title="Total de Registros"
                value={`${report.recordCount} itens`}
                subtitle="Volume coberto neste lote"
                icon={Layers}
                variant="emerald"
              />

              <StatCard
                title="Formato de Saída"
                value={report.format}
                subtitle="Alta Resolução 300 DPI"
                icon={FileText}
                variant="emerald"
              />

              <StatCard
                title="Data de Criação"
                value={new Date(report.createdAt).toLocaleDateString('pt-BR')}
                subtitle={new Date(report.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                icon={Clock}
                variant="emerald"
              />
            </section>

            {/* Informações Estruturadas do Relatório */}
            <section className="relative overflow-hidden rounded-2xl bg-[#08120a]/85 border border-emerald-500/20 shadow-2xl backdrop-blur-md p-6 mb-8">
              <div className="flex items-center gap-2 mb-6">
                <div className="p-2 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-[#22c55e]">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">{report.title}</h3>
                  <p className="text-xs text-neutral-400 font-mono">ID Criptográfico: {report.id}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-[#040a06] border border-emerald-500/15">
                  <span className="text-neutral-500 block mb-1 font-semibold">Tipo do Documento</span>
                  <span className="text-sm font-black text-[#22c55e]">
                    {report.type.replace('_', ' ')}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-[#040a06] border border-emerald-500/15">
                  <span className="text-neutral-500 block mb-1 font-semibold">Autor Responsável</span>
                  <span className="text-sm font-bold text-white">David Admin (Auditor Chefe)</span>
                </div>

                <div className="sm:col-span-2 p-4 rounded-xl bg-[#040a06] border border-emerald-500/15">
                  <span className="text-neutral-500 block mb-1 font-semibold">Filtros e Critérios Aplicados</span>
                  <pre className="p-3 rounded-lg bg-black/60 font-mono text-[11px] text-emerald-300/90 overflow-x-auto">
                    {report.filters ? JSON.stringify(JSON.parse(report.filters), null, 2) : 'Nenhum filtro restritivo aplicado'}
                  </pre>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-emerald-500/15 flex items-center justify-end">
                <button
                  onClick={handleDownload}
                  disabled={downloading}
                  className="flex items-center gap-2 bg-[#22c55e] text-black hover:bg-[#1ea850] px-5 py-2.5 rounded-xl text-xs font-black transition-all active:scale-[0.98] cursor-pointer shadow-[0_0_15px_rgba(34,197,94,0.3)] disabled:opacity-40"
                >
                  {downloading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                  <span>{downloading ? 'Gerando Segunda Via...' : 'Baixar Segunda Via em PDF'}</span>
                </button>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
