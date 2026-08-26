// app/reports/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowDownToLine,
  FileText,
  FileDown,
  Plus,
  RefreshCw,
  AlertCircle,
  Clock,
  Sparkles,
  ArrowUpRight,
  X,
  Layers,
} from 'lucide-react';

import { Sidebar } from '../../components/layout/Sidebar';
import { Header } from '../../components/layout/Header';
import { StatCard } from '../../components/shared/StatCard';
import { SkeletonLoader } from '../../components/shared/SkeletonLoader';
import { EmptyState } from '../../components/shared/EmptyState';
import { generateFuturisticPDF } from '../../lib/pdf-generator';

interface ExportedReportItem {
  id: string;
  userId: string;
  type: string;
  title: string;
  filters?: string | null;
  recordCount: number;
  format: string;
  createdAt: string;
}

export default function ReportsPage() {
  const [reports, setReports] = useState<ExportedReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reportType, setReportType] = useState<
    'GENERAL_AUDIT' | 'CRITICAL_ISSUES' | 'EXECUTIVE_SUMMARY'
  >('GENERAL_AUDIT');
  const [reportTitle, setReportTitle] = useState('Auditoria Geral de Estoque');
  const [generating, setGenerating] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    try {
      const res = await fetch('/api/reports');
      const json = await res.json();
      if (json.success && json.data) {
        setReports(json.data);
      } else {
        setError(json.error || 'Falha ao carregar relatórios.');
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
    await fetchReports();
  };

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const res = await fetch('/api/reports');
        const json = await res.json();
        if (isMounted) {
          if (json.success && json.data) {
            setReports(json.data);
          } else {
            setError(json.error || 'Falha ao carregar relatórios.');
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

  const handleGenerateReport = async () => {
    setGenerating(true);
    try {
      // 1. Busca dados reais no endpoint de logs ou métricas
      const statusParam = reportType === 'CRITICAL_ISSUES' ? 'CRITICAL' : 'ALL';
      const logsRes = await fetch(`/api/logs?limit=50&status=${statusParam}`);
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

      // 2. Persiste metadados do relatório no banco
      const saveRes = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: reportType,
          title: reportTitle,
          recordCount: rowsData.length,
          format: 'PDF',
          filters: { status: statusParam },
        }),
      });
      const saveJson = await saveRes.json();

      // 3. Gera e baixa o PDF
      const doc = await generateFuturisticPDF({
        title: reportTitle,
        subtitle: `Emitido por Enviagora AI Security Engine • Total: ${rowsData.length} registros auditados`,
        type: reportType,
        stats: [
          {
            label: 'Total de Registros',
            value: rowsData.length,
            subtext: 'Itens processados',
            variant: 'emerald',
          },
          {
            label: 'Tipo de Relatório',
            value: reportType === 'CRITICAL_ISSUES' ? 'Crítico' : 'Geral',
            subtext: 'Classificação operacional',
            variant: reportType === 'CRITICAL_ISSUES' ? 'rose' : 'emerald',
          },
          {
            label: 'Padrão Criptográfico',
            value: 'V2.4',
            subtext: 'Assinatura válida',
            variant: 'emerald',
          },
        ],
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

      doc.save(`relatorio-${reportType.toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`);

      if (saveJson.success && saveJson.data) {
        setReports((prev) => [saveJson.data, ...prev]);
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error('Erro na geração do relatório:', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleReDownload = async (report: ExportedReportItem) => {
    setDownloadingId(report.id);
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
        subtitle: `Segunda Via • Emitido originalmente em ${new Date(report.createdAt).toLocaleDateString('pt-BR')}`,
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

      doc.save(`reemissao-${report.title.toLowerCase().replace(/\s+/g, '-')}.pdf`);
    } catch (err) {
      console.error('Erro no re-download:', err);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#020703] font-sans antialiased text-white">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10 relative">
        <Header
          title="RELATÓRIOS"
          highlightWord="EXPORTADOS"
          badgeText="LIBRARY V2.4"
          subtitle="Biblioteca Persistida de Documentos Executivos, Auditorias e Re-emissão de PDFs"
          actions={
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 bg-[#22c55e] text-black hover:bg-[#1ea850] px-4 h-9 rounded-xl text-xs font-black transition-all active:scale-[0.98] shadow-[0_0_15px_rgba(34,197,94,0.3)] cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Gerar Novo Relatório</span>
              </button>

              <button
                onClick={handleManualRefresh}
                disabled={loading}
                className="flex items-center justify-center w-9 h-9 rounded-xl bg-neutral-900/80 border border-emerald-500/20 hover:border-emerald-500/40 text-neutral-300 hover:text-white transition-all cursor-pointer"
                title="Atualizar Biblioteca"
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
            title="Erro ao Carregar Relatórios"
            description={error}
            actionText="Tentar Novamente"
            onActionClick={handleManualRefresh}
          />
        ) : reports.length === 0 ? (
          <EmptyState
            icon={ArrowDownToLine}
            title="Nenhum Relatório Exportado na Biblioteca"
            description="Gere seu primeiro documento executivo de auditoria ou conciliação para consultá-lo e baixá-lo a qualquer momento."
            actionText="Gerar Meu Primeiro Relatório"
            onActionClick={() => setIsModalOpen(true)}
          />
        ) : (
          <>
            {/* Grid de 3 StatCards */}
            <section className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
              <StatCard
                title="Relatórios na Biblioteca"
                value={reports.length}
                subtitle="Documentos persistidos"
                icon={FileText}
                variant="emerald"
                badge="DOCUMENTOS"
              />

              <StatCard
                title="Total de Registros Cobertos"
                value={reports.reduce((acc, r) => acc + (r.recordCount || 0), 0)}
                subtitle="SKUs auditados nos relatórios"
                icon={Layers}
                variant="emerald"
              />

              <StatCard
                title="Última Emissão"
                value={
                  reports.length > 0
                    ? new Date(reports[0].createdAt).toLocaleDateString('pt-BR')
                    : 'Nenhuma'
                }
                subtitle="Disponível para download 300 DPI"
                icon={Clock}
                variant="emerald"
              />
            </section>

            {/* Tabela de Relatórios Exportados */}
            <section className="relative overflow-hidden rounded-2xl bg-[#08120a]/85 border border-emerald-500/20 shadow-2xl backdrop-blur-md mb-8">
              <div className="p-5 border-b border-emerald-500/15 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#22c55e]" /> Biblioteca de Documentos Emitidos
                  </h3>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Histórico permanente com metadados e re-download de alta definição
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-emerald-500/20 text-neutral-400 bg-emerald-950/30">
                      <th className="py-3.5 px-4 font-bold">Título do Relatório</th>
                      <th className="py-3.5 px-4 font-bold">Tipo</th>
                      <th className="py-3.5 px-4 font-bold">Registros</th>
                      <th className="py-3.5 px-4 font-bold">Formato</th>
                      <th className="py-3.5 px-4 font-bold">Data de Emissão</th>
                      <th className="py-3.5 px-4 font-bold text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-500/10 text-neutral-200">
                    {reports.map((report) => (
                      <tr key={report.id} className="hover:bg-emerald-500/5 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-white">
                          <Link
                            href={`/reports/${report.id}`}
                            className="hover:text-[#22c55e] transition-colors"
                          >
                            {report.title}
                          </Link>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                              report.type === 'CRITICAL_ISSUES'
                                ? 'bg-rose-950/60 text-rose-400 border border-rose-500/30'
                                : 'bg-emerald-950/60 text-[#22c55e] border border-emerald-500/30'
                            }`}
                          >
                            {report.type.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-neutral-300">
                          {report.recordCount} itens
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-700 text-neutral-300 font-mono text-[10px]">
                            {report.format}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-neutral-400 font-medium">
                          {new Date(report.createdAt).toLocaleString('pt-BR')}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleReDownload(report)}
                              disabled={downloadingId === report.id}
                              className="inline-flex items-center gap-1.5 bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-500/30 text-emerald-300 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-40"
                              title="Baixar PDF em Alta Definição"
                            >
                              {downloadingId === report.id ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <FileDown className="w-3.5 h-3.5" />
                              )}
                              <span>Baixar PDF</span>
                            </button>

                            <Link
                              href={`/reports/${report.id}`}
                              className="inline-flex items-center gap-1 bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
                            >
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </Link>
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

        {/* Modal de Criação de Novo Relatório */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="relative w-full max-w-lg rounded-2xl bg-[#061108] border border-emerald-500/40 shadow-2xl p-6 overflow-hidden">
              <div className="flex items-center justify-between pb-4 border-b border-emerald-500/20 mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-[#22c55e]">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">Gerar Novo Relatório</h3>
                    <p className="text-xs text-neutral-400">Emissão instantânea com motor High-DPI</p>
                  </div>
                </div>

                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4 mb-6 text-xs">
                <div>
                  <label className="block text-neutral-400 font-bold mb-1.5">Título do Documento</label>
                  <input
                    type="text"
                    value={reportTitle}
                    onChange={(e) => setReportTitle(e.target.value)}
                    className="w-full bg-[#040a06] border border-emerald-500/20 focus:border-emerald-500/60 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none font-medium"
                  />
                </div>

                <div>
                  <label className="block text-neutral-400 font-bold mb-1.5">Tipo de Auditoria</label>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      {
                        id: 'GENERAL_AUDIT' as const,
                        label: 'Auditoria Geral de Estoque',
                        desc: 'Todos os SKUs e histórico de conciliação recente',
                      },
                      {
                        id: 'CRITICAL_ISSUES' as const,
                        label: 'Divergências Críticas e Quebras',
                        desc: 'Foco exclusivo em quebras de estoque e falhas ativas',
                      },
                      {
                        id: 'EXECUTIVE_SUMMARY' as const,
                        label: 'Resumo Executivo e SLAs',
                        desc: 'Visão agregada de acurácia operacional e volumetria',
                      },
                    ].map((typeOption) => (
                      <button
                        key={typeOption.id}
                        type="button"
                        onClick={() => {
                          setReportType(typeOption.id);
                          setReportTitle(typeOption.label);
                        }}
                        className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
                          reportType === typeOption.id
                            ? 'bg-emerald-950/80 border-emerald-500/60 text-white shadow-[0_0_12px_rgba(34,197,94,0.2)]'
                            : 'bg-[#040a06] border-neutral-800 text-neutral-400 hover:border-emerald-500/30 hover:text-neutral-200'
                        }`}
                      >
                        <div className="font-bold text-white text-xs">{typeOption.label}</div>
                        <div className="text-[11px] text-neutral-400 mt-0.5 font-medium">
                          {typeOption.desc}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-emerald-500/15">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs font-semibold transition-all cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={handleGenerateReport}
                  disabled={generating || !reportTitle.trim()}
                  className="flex items-center gap-2 bg-[#22c55e] text-black hover:bg-[#1ea850] px-5 py-2 rounded-xl text-xs font-black transition-all active:scale-[0.98] disabled:opacity-40 cursor-pointer shadow-[0_0_15px_rgba(34,197,94,0.3)]"
                >
                  {generating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
                  <span>{generating ? 'Processando...' : 'Emitir e Baixar'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
