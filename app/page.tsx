"use client";

import React, { useState, useEffect } from 'react';
import {
  Brain, Zap, ShieldCheck, AlertCircle, TrendingUp, DollarSign,
  Package, FileSpreadsheet, Sparkles, RefreshCw, X, CheckCircle2,
  Info, ArrowUpRight, Menu, Home, BarChart3, Boxes, Star, FileText, ArrowDownToLine, Settings
} from 'lucide-react';
import {
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Area, AreaChart
} from 'recharts';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface AuditLogItem {
  id: string;
  sku: string;
  erp: number;
  mkt: number;
  failure: string;
  status: string;
}

interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

const historicalMetrics = [
  { name: 'Jan', vendas: 3800, erros: 180 },
  { name: 'Fev', vendas: 4200, erros: 210 },
  { name: 'Mar', vendas: 5900, erros: 110 },
  { name: 'Abr', vendas: 6100, erros: 95 },
  { name: 'Mai', vendas: 7500, erros: 42 },
];

const mockInitialData: AuditLogItem[] = [
  { id: '1', sku: 'ENV-102', erp: 50, mkt: 42, failure: 'Quebra de Estoque Físico', status: 'CRITICAL' },
  { id: '2', sku: 'ENV-309', erp: 15, mkt: 0, failure: 'SKU (Stock Keeping Unit) (Unidade de Manutenção de Estoque) Ausente na API (Application Programming Interface) (Interface de Programação de Aplicação)', status: 'CRITICAL' },
  { id: '3', sku: 'ENV-505', erp: 12, mkt: 12, failure: 'Nenhuma', status: 'OK' }
];

// =========================================================================
// ⚙️ ÁREA DE CONFIGURAÇÃO DE TAMANHO E POSICIONAMENTO DO SEU SVG (Scalable Vector Graphics) (Gráficos Vetoriais Escalonáveis)
// =========================================================================

// Ajuste os valores abaixo para encontrar o tamanho e lado ideais do seu logo
const CONFIG_LOGO_COMPLETO = {
  src: "/img/logo-enviagora.svg", // Caminho do seu SVG integrado no projeto
  width: "140px",                 // Altere a largura desejada (ex: "120px", "160px", etc.)
  height: "auto",                 // Mantém a proporção do SVG
  marginLeft: "4px",              // Ajuste de margem horizontal para alinhar ao lado
  marginTop: "2px",               // Ajuste de altura para alinhar verticalmente com a seta
};

const CONFIG_LOGO_SETA = {
  src: "/img/enviagora-seta.svg", // Caminho do seu SVG de seta individual
  width: "20px",                  // Largura do ícone da seta na barra lateral
  height: "20px",                 // Altura do ícone da seta na barra lateral
  marginLeft: "0px",              // Ajuste de margem horizontal
  marginTop: "0px",               // Ajuste vertical
};

// 1. LOGO COMPLETO (Aparece quando o menu está expandido)
const LogoCompleto = ({ className = "" }) => {
  return (
    <img
      src={CONFIG_LOGO_COMPLETO.src}
      alt="Logo Enviagora"
      style={{
        width: CONFIG_LOGO_COMPLETO.width,
        height: CONFIG_LOGO_COMPLETO.height,
        marginLeft: CONFIG_LOGO_COMPLETO.marginLeft,
        marginTop: CONFIG_LOGO_COMPLETO.marginTop,
      }}
      className={`${className} object-contain`}
      onError={(e) => {
        // Fallback textual caso o SVG ainda esteja sendo indexado localmente
        e.currentTarget.onerror = null;
        e.currentTarget.style.display = 'none';
      }}
    />
  );
};

// 2. LOGO SETA (Ícone individual da seta)
const LogoSeta = ({ className = "", style = {} }) => {
  return (
    <img
      src={CONFIG_LOGO_SETA.src}
      alt="Seta Enviagora"
      style={{
        width: CONFIG_LOGO_SETA.width,
        height: CONFIG_LOGO_SETA.height,
        marginLeft: CONFIG_LOGO_SETA.marginLeft,
        marginTop: CONFIG_LOGO_SETA.marginTop,
        ...style
      }}
      className={`${className} object-contain`}
      onError={(e) => {
        e.currentTarget.onerror = null;
        e.currentTarget.style.display = 'none';
      }}
    />
  );
};

const FormattedInsight = ({ text }: { text: string }) => {
  if (!text) {
    return <span className="text-neutral-500 font-medium">Aguardando comando de varredura para emitir o diagnóstico operacional.</span>;
  }

  const lines = text.split('\n');
  return (
    <div className="space-y-3.5 text-[11px] font-normal tracking-wide leading-relaxed text-neutral-300">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('##')) {
          return (
            <h4 key={idx} className="text-xs font-bold text-[#bfff00] mt-4 first:mt-0 flex items-center gap-1.5 border-b border-lime-950/30 pb-1">
              <Sparkles className="w-3 h-3 text-[#bfff00] shrink-0" />
              {trimmed.replace('##', '').trim()}
            </h4>
          );
        }
        if (trimmed.startsWith('*')) {
          return (
            <div key={idx} className="flex items-start gap-2 bg-[#12161a]/60 p-2.5 rounded-lg border border-neutral-800/30 hover:border-neutral-700/40 transition-all">
              <span className="w-1.5 h-1.5 rounded-full bg-[#bfff00] mt-1.5 shrink-0 animate-pulse" />
              <p className="flex-1">{trimmed.replace('*', '').trim()}</p>
            </div>
          );
        }
        if (trimmed) {
          return <p key={idx} className="text-neutral-400 leading-relaxed">{trimmed}</p>;
        }
        return null;
      })}
    </div>
  );
};

export default function App() {
  const [analysis, setAnalysis] = useState("");
  const [loading, setLoading] = useState(false);
  const [sheetLoading, setSheetLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [auditData, setAuditData] = useState<AuditLogItem[]>([]);
  const [fetchingData, setFetchingData] = useState(true);
  const [apiError, setApiError] = useState("");
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [activeTab, setActiveTab] = useState('home');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMenuHovered, setIsMenuHovered] = useState(false);

  const addToast = (message: string, type: 'success' | 'error' | 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    setFetchingData(true);
    fetch('/api/audit-logs')
      .then(res => res.json())
      .then(result => {
        if (result.success) {
          setAuditData(result.data || []);
        } else {
          setApiError(result.details || result.error);
          setAuditData(mockInitialData);
          addToast("Carregado em modo de simulação com dados locais.", "info");
        }
      })
      .catch(() => {
        setApiError("Não foi possível conectar ao servidor.");
        setAuditData(mockInitialData);
        addToast("Modo de simulação ativo (Offline).", "info");
      })
      .finally(() => setFetchingData(false));
  }, []);

  const exportToSheets = async () => {
    setSheetLoading(true);
    try {
      const res = await fetch('/api/sheets', { method: 'POST' });
      const result = await res.json();
      if (result.success) {
        addToast(`${result.count} registros sincronizados no Google Sheets.`, "success");
      } else {
        addToast(`Erro ao exportar planilha: ${result.error}`, "error");
      }
    } catch {
      setTimeout(() => {
        addToast("Sincronização simulada: 3 logs integrados com sucesso!", "success");
        setSheetLoading(false);
      }, 1000);
    } finally {
      setSheetLoading(false);
    }
  };

  const exportToPDF = () => {
    if (auditData.length === 0) return;
    setPdfLoading(true);

    try {
      const doc = new jsPDF();
      
      doc.setFillColor(7, 7, 10);
      doc.rect(0, 0, 220, 40, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('Helvetica', 'bold');
      doc.text('DASHBOARD AI ENVIAGORA', 14, 18);
      
      doc.setTextColor(191, 255, 0);
      doc.setFontSize(9);
      doc.text('RELATÓRIO CORPORATIVO DE AUDITORIA DE ESTOQUE', 14, 26);
      
      doc.setTextColor(156, 163, 175);
      doc.text(`EMISSÃO: ${new Date().toLocaleDateString('pt-BR')}`, 150, 26);

      const tableRows = auditData.map(log => [
        log.sku,
        `${log.erp} un`,
        `${log.mkt} un`,
        log.failure,
        log.status
      ]);

      autoTable(doc, {
        startY: 48,
        head: [['Código SKU', 'Estoque Físico ERP', 'Canais Marketplace', 'Natureza da Divergência', 'Status']],
        body: tableRows,
        theme: 'striped',
        headStyles: { fillColor: [12, 12, 17], textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold' },
        bodyStyles: { fontSize: 8, textColor: [40, 40, 40] },
        columnStyles: { 4: { fontStyle: 'bold' } },
      });

      doc.save(`auditoria-estoque-${new Date().toISOString().split('T')[0]}.pdf`);
      addToast("Relatório PDF baixado com sucesso.", "success");
    } catch (error) {
      addToast("Falha ao gerar arquivo PDF de auditoria.", "error");
    } finally {
      setPdfLoading(false);
    }
  };

  const runAnalysis = async () => {
    setLoading(true);
    setAnalysis("");
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataset: auditData }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const output = await res.json();
      setAnalysis(output.analysis);
      addToast("Auditoria completada pelo James AI (Artificial Intelligence) (Inteligência Artificial).", "success");
    } catch {
      clearTimeout(timeoutId);
      setTimeout(() => {
        setAnalysis("## Diagnóstico Operacional de Estoques\nConcluímos a avaliação do inventário ativo...\n\n* **ENV-102**: Divergência crítica detectada no canal de venda.\n* **ENV-309**: SKU (Stock Keeping Unit) (Unidade de Manutenção de Estoque) ausente no catálogo da API (Application Programming Interface) (Interface de Programação de Aplicação) do marketplace.\n* **ENV-505**: Estoque perfeitamente íntegro.");
        addToast("Simulação de análise de AI (Artificial Intelligence) (Inteligência Artificial) carregada.", "success");
        setLoading(false);
      }, 500);
    } finally {
      setLoading(false);
    }
  };

  const criticalCount = auditData.filter(d => d.status === 'CRITICAL').length;
  const isDisabled = loading || fetchingData || auditData.length === 0;

  return (
    <div className="flex min-h-screen bg-[#080a0d] text-neutral-100 font-sans antialiased selection:bg-[#bfff00]/20 selection:text-[#bfff00] relative overflow-hidden">

      {/* Luzes de Fundo Simulando Brilho do Monitor */}
      <div className="absolute top-[-15%] left-[-5%] w-[60%] h-[50%] rounded-full bg-[#bfff00]/5 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-5%] w-[60%] h-[50%] rounded-full bg-rose-500/5 blur-[140px] pointer-events-none" />

      {/* Barra Lateral Premium Glassmorphism com Efeito de Hover Dinâmico */}
      <aside className={`hidden sm:flex flex-col justify-between py-6 bg-[#0f1216]/60 backdrop-blur-xl border-r border-neutral-800/40 shrink-0 z-30 sticky top-0 h-screen transition-all duration-300 ${isExpanded ? 'w-60 px-4' : 'w-20 px-2'}`}>
        <div className="flex flex-col gap-9 w-full">

          {/* Cabeçalho da Barra Lateral com Ícone de Seta / 3 Barras e Logo */}
          <div className={`flex items-center gap-3 w-full border-b border-neutral-800/30 pb-4 ${isExpanded ? 'px-2 justify-between' : 'justify-center'}`}>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              onMouseEnter={() => setIsMenuHovered(true)}
              onMouseLeave={() => setIsMenuHovered(false)}
              className="p-2.5 rounded-xl transition-all duration-300 hover:bg-neutral-800/40 cursor-pointer flex items-center justify-center shrink-0"
              title={isExpanded ? "Recolher Menu" : "Expandir Menu"}
            >
              {isMenuHovered ? (
                <Menu size={18} className="text-[#bfff00] transition-all duration-300 rotate-180" />
              ) : (
                <LogoSeta />
              )}
            </button>
            {isExpanded && (
              <div className="flex items-center gap-0.5 animate-slide-in">
                <LogoCompleto />
              </div>
            )}
          </div>

          <nav className="flex flex-col gap-4.5 w-full">
            {[
              { id: 'home', icon: Home, label: 'Dashboard Base' },
              { id: 'analytics', icon: BarChart3, label: 'Métricas & Análises' },
              { id: 'inventory', icon: Boxes, label: 'Controle de SKUs' },
              { id: 'favorites', icon: Star, label: 'Produtos Favoritos' },
              { id: 'logs', icon: FileText, label: 'Histórico de Logs' },
              { id: 'downloads', icon: ArrowDownToLine, label: 'Relatórios Exportados' },
            ].map((tab) => {
              const IconComponent = tab.icon;
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  title={!isExpanded ? tab.label : ""}
                  className={`w-full p-3 rounded-xl transition-all duration-300 relative group flex items-center cursor-pointer ${isExpanded ? 'justify-start gap-4 px-4' : 'justify-center'} ${isSelected
                      ? 'text-[#bfff00] bg-[#bfff00]/10 border border-[#bfff00]/35 shadow-[0_0_15px_rgba(191,255,0,0.15)]'
                      : 'text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800/20 border border-transparent'
                    }`}
                >
                  <IconComponent size={18} className="transition-transform duration-300 group-hover:scale-105 shrink-0" />
                  <span className={`text-xs font-semibold tracking-wide whitespace-nowrap transition-all duration-200 ${isExpanded ? 'opacity-100 max-w-xs visible' : 'opacity-0 max-w-0 invisible overflow-hidden'}`}>{tab.label}</span>
                  {isSelected && <span className="absolute left-0 w-1 h-5 bg-[#bfff00] rounded-r-full" />}
                </button>
              );
            })}
          </nav>
        </div>

        <button onClick={() => setActiveTab('settings')} className={`w-full p-3 rounded-xl transition-all duration-300 flex items-center cursor-pointer ${isExpanded ? 'justify-start gap-4 px-4' : 'justify-center'} ${activeTab === 'settings' ? 'text-[#bfff00] bg-[#bfff00]/10 border border-[#bfff00]/30' : 'text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800/30'}`} title={!isExpanded ? "Configurações do Painel" : ""}>
          <Settings size={18} className="shrink-0" />
          <span className={`text-xs font-semibold tracking-wide whitespace-nowrap transition-all duration-200 ${isExpanded ? 'opacity-100 max-w-xs visible' : 'opacity-0 max-w-0 invisible overflow-hidden'}`}>Configurações</span>
        </button>
      </aside>

      {/* Conteúdo Principal */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10 relative">

        {/* Sistema de Toasts */}
        <div className="fixed top-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
          {toasts.map((t) => (
            <div key={t.id} className="pointer-events-auto flex items-start gap-3 bg-[#111419]/95 border border-neutral-800/80 backdrop-blur-xl p-4 rounded-xl shadow-2xl shadow-black/80 animate-slide-in">
              {t.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />}
              {t.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />}
              {t.type === 'info' && <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />}
              <div className="flex-1">
                <p className="text-xs font-semibold text-neutral-200">Notificação do Sistema</p>
                <p className="text-[11px] text-neutral-400 mt-1 leading-normal">{t.message}</p>
              </div>
              <button onClick={() => removeToast(t.id)} className="text-neutral-500 hover:text-neutral-300 transition-colors p-0.5 rounded"><X className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>

        {/* Cabeçalho da Interface */}
        <header className="relative flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8 border-b border-neutral-800/40 pb-8">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#bfff00] animate-pulse shadow-[0_0_8px_#bfff00]" />
              <span className="text-[9px] uppercase font-bold tracking-[0.2em] text-[#bfff00]">Sistema de Sincronização Ativa</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-1 select-none">
              Dashboard <span className="text-[#bfff00]">AI</span>
            </h1>

            <p className="text-xs text-neutral-500 mt-1.5 font-medium">
              Painel Corporativo de Auditoria Operacional
              <span className="mx-2 text-neutral-800">•</span>
              <span className="bg-[#12161a] px-2 py-0.5 rounded text-[10px] text-neutral-400 border border-neutral-800/60">
                Prisma Engine v2.4
              </span>
            </p>
          </div>

          {/* Botões do Topo com Estilo Vidro Translúcido */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={exportToSheets}
              disabled={sheetLoading || fetchingData || auditData.length === 0}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-[#12161a]/80 hover:bg-neutral-800/90 border border-neutral-800/60 text-neutral-200 px-4 h-10 rounded-lg text-xs font-semibold transition-all active:scale-[0.98] disabled:opacity-35 disabled:pointer-events-none whitespace-nowrap"
            >
              {sheetLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-neutral-400" /> : <FileSpreadsheet className="w-3.5 h-3.5 text-neutral-400" />}
              {sheetLoading ? "Sincronizando..." : "Exportar Planilha"}
            </button>

            <button
              onClick={exportToPDF}
              disabled={pdfLoading || fetchingData || auditData.length === 0}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-[#12161a]/80 hover:bg-neutral-800/90 border border-neutral-800/60 text-neutral-200 px-4 h-10 rounded-lg text-xs font-semibold transition-all active:scale-[0.98] disabled:opacity-35 disabled:pointer-events-none whitespace-nowrap"
            >
              {pdfLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-neutral-400" /> : <FileText className="w-3.5 h-3.5 text-neutral-400" />}
              {pdfLoading ? "Gerando..." : "Baixar PDF"}
            </button>

            <button
              onClick={runAnalysis}
              disabled={isDisabled}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-[#bfff00] text-black hover:bg-[#a5db00] px-5 h-10 rounded-lg text-xs font-bold transition-all active:scale-[0.98] disabled:bg-neutral-900 disabled:text-neutral-600 disabled:border disabled:border-neutral-800/80 disabled:opacity-50 whitespace-nowrap shadow-[0_0_20px_rgba(191,255,0,0.3)] hover:shadow-[0_0_25px_rgba(191,255,0,0.45)]"
            >
              {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 fill-current" />}
              {loading ? "Processando..." : "Disparar Análise"}
            </button>
          </div>
        </header>

        {activeTab === 'home' ? (
          <>
            {/* Grid de Cards de Métricas */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
              {/* Receita Monitorada */}
              <div className="bg-[#0f1216]/60 backdrop-blur-xl border border-neutral-800/40 rounded-xl p-5 flex justify-between items-center transition-all duration-300 hover:border-neutral-700/60 hover:translate-y-[-2px] hover:shadow-[0_10px_30px_-15px_rgba(0,0,0,0.7)] group">
                <div>
                  <p className="text-[9px] text-neutral-500 uppercase tracking-widest font-bold mb-1">Receita Monitorada</p>
                  <p className="text-xl font-extrabold tracking-tight text-white">R$ 145.230</p>
                  <span className="text-[9px] text-[#bfff00] flex items-center gap-0.5 mt-1 font-medium">
                    <ArrowUpRight className="w-2.5 h-2.5" /> +12.3% este mês
                  </span>
                </div>
                <div className="p-3 bg-neutral-900/60 rounded-lg border border-neutral-800/45 group-hover:border-[#bfff00]/30 group-hover:bg-[#bfff00]/5 transition-all duration-300">
                  <DollarSign className="text-[#bfff00] transition-transform duration-300 group-hover:scale-110" size={16} />
                </div>
              </div>

              {/* Alertas Ativos */}
              <div className={`bg-[#0f1216]/60 backdrop-blur-xl border rounded-xl p-5 flex justify-between items-center transition-all duration-300 hover:translate-y-[-2px] hover:shadow-[0_10px_30px_-15px_rgba(0,0,0,0.7)] group ${criticalCount > 0 ? 'border-rose-900/30 hover:border-rose-500/30' : 'border-neutral-800/40 hover:border-neutral-700/60'
                }`}>
                <div>
                  <p className="text-[9px] text-neutral-500 uppercase tracking-widest font-bold mb-1">Alertas Ativos</p>
                  <p className={`text-xl font-extrabold tracking-tight ${criticalCount > 0 ? 'text-rose-400 font-bold' : 'text-neutral-400'}`}>
                    {fetchingData ? <span className="inline-block w-12 h-5 bg-neutral-900/60 animate-pulse rounded" /> : `${criticalCount} Críticos`}
                  </p>
                  <span className={`text-[9px] flex items-center gap-1 mt-1 ${criticalCount > 0 ? 'text-rose-400/80' : 'text-neutral-500'}`}>
                    <AlertCircle className="w-2.5 h-2.5" /> Ações de ajuste recomendadas
                  </span>
                </div>
                <div className={`p-3 rounded-lg border transition-all duration-300 ${criticalCount > 0 ? 'bg-rose-950/10 border-rose-900/30 group-hover:border-rose-500/40' : 'bg-neutral-900/60 border-neutral-800/45'
                  }`}>
                  <AlertCircle className={`transition-transform duration-300 group-hover:scale-110 ${criticalCount > 0 ? 'text-rose-400' : 'text-neutral-500'}`} size={16} />
                </div>
              </div>

              {/* Acurácia Geral */}
              <div className="bg-[#0f1216]/60 backdrop-blur-xl border border-neutral-800/40 rounded-xl p-5 flex justify-between items-center transition-all duration-300 hover:border-neutral-700/60 hover:translate-y-[-2px] hover:shadow-[0_10px_30px_-15px_rgba(0,0,0,0.7)] group">
                <div>
                  <p className="text-[9px] text-neutral-500 uppercase tracking-widest font-bold mb-1">Acurácia Geral</p>
                  <p className="text-xl font-extrabold tracking-tight text-[#bfff00]">98.4%</p>
                  <span className="text-[9px] text-neutral-500 flex items-center gap-1 mt-1">
                    <ShieldCheck className="w-2.5 h-2.5 text-[#bfff00]" /> Meta corporativa de SLA (Service Level Agreement) (Acordo de Nível de Serviço) ativa
                  </span>
                </div>
                <div className="p-3 bg-neutral-900/60 rounded-lg border border-neutral-800/45 group-hover:border-[#bfff00]/30 group-hover:bg-[#bfff00]/5 transition-all duration-300">
                  <ShieldCheck className="text-[#bfff00] transition-transform duration-300 group-hover:scale-110" size={16} />
                </div>
              </div>
            </section>

            {/* Painéis Secundários (Gráfico + Insights da IA) */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Gráfico de Tendências */}
              <div className="lg:col-span-2 bg-[#0f1216]/60 backdrop-blur-xl border border-neutral-800/40 rounded-xl p-6 flex flex-col justify-between shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                  <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                    <TrendingUp size={14} className="text-neutral-500" /> Tendência Logística Mensal
                  </p>
                  <div className="flex items-center gap-4 text-[10px] font-semibold text-neutral-400">
                    <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[#bfff00]" /> Vendas</span>
                    <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Erros Sinc.</span>
                  </div>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={historicalMetrics}>
                      <defs>
                        <linearGradient id="vendasGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#bfff00" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#bfff00" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="errosGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.12} />
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#13171d" />
                      <XAxis dataKey="name" stroke="#4b5563" fontSize={10} tickLine={false} axisLine={false} dy={10} />
                      <YAxis stroke="#4b5563" fontSize={10} tickLine={false} axisLine={false} dx={-10} />
                      <Tooltip contentStyle={{ backgroundColor: '#111419', borderColor: '#1f252d', borderRadius: '8px', fontSize: 11, color: '#e5e5e5', backdropFilter: 'blur(8px)', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }} />
                      <Area type="monotone" dataKey="vendas" stroke="#bfff00" strokeWidth={2} fillOpacity={1} fill="url(#vendasGrad)" />
                      <Area type="monotone" dataKey="erros" stroke="#ef4444" strokeWidth={1.5} fillOpacity={1} fill="url(#errosGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* James AI (Artificial Intelligence) (Inteligência Artificial) Insight */}
              <div className="bg-[#0f1216]/60 backdrop-blur-xl border border-neutral-800/40 rounded-xl p-6 flex flex-col justify-between shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-[#bfff00]/5 rounded-full blur-2xl pointer-events-none" />
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs font-bold text-[#bfff00] uppercase tracking-widest flex items-center gap-2">
                    <Brain size={14} className="text-[#bfff00] animate-pulse" /> James AI Insight
                  </p>
                  <span className="text-[9px] bg-[#bfff00]/10 text-[#bfff00] border border-[#bfff00]/25 px-2 py-0.5 rounded font-mono">Auto-Scan Ativo</span>
                </div>

                <div className="h-64 bg-[#0a0d10]/90 rounded-lg p-4 text-neutral-300 overflow-y-auto custom-scrollbar relative border border-neutral-800/30">
                  {loading ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3 text-neutral-500">
                      <div className="relative flex items-center justify-center">
                        <div className="w-8 h-8 border-2 border-[#bfff00]/20 border-t-[#bfff00] rounded-full animate-spin"></div>
                        <Brain className="w-3.5 h-3.5 text-[#bfff00] absolute" />
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] font-mono text-neutral-400">Processando Logs Operacionais</p>
                      </div>
                    </div>
                  ) : (<FormattedInsight text={analysis} />)}
                </div>
              </div>
            </section>

            {/* SKUs Auditados em Tempo Real (Tabela Glassmorphism) */}
            <section className="bg-[#0f1216]/60 backdrop-blur-xl border border-neutral-800/40 rounded-xl p-6 shadow-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-neutral-800/40 pb-4">
                <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                  <Package size={14} className="text-neutral-500" /> SKUs (Stock Keeping Unit) (Unidade de Manutenção de Estoque) Auditados em Tempo Real
                </p>
                <div className="flex items-center gap-2 text-[10px] text-neutral-500 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#bfff00] shadow-[0_0_6px_#bfff00]" />
                  Sincronizado com o BD (banco de dados) SQLite Local
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="text-neutral-500 uppercase text-[9px] tracking-wider font-bold">
                      <th className="pb-3 px-4 font-semibold">Código SKU (Stock Keeping Unit) (Unidade de Manutenção de Estoque)</th>
                      <th className="pb-3 px-4 font-semibold">Estoque Físico ERP (Enterprise Resource Planning) (Planejamento de Recursos Empresariais)</th>
                      <th className="pb-3 px-4 font-semibold">Canais Marketplace</th>
                      <th className="pb-3 px-4 font-semibold">Natureza da Divergência</th>
                      <th className="pb-3 px-4 font-semibold text-right">Status de Integridade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/30">
                    {fetchingData ? (
                      <tr>
                        <td colSpan={5} className="py-12">
                          <div className="flex flex-col items-center justify-center gap-2 text-neutral-500 font-mono text-[11px]">
                            <RefreshCw className="w-4 h-4 animate-spin text-neutral-600" />
                            <span>Consultando tabelas locais...</span>
                          </div>
                        </td>
                      </tr>
                    ) : apiError && auditData.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-12 text-rose-400/90 font-medium">
                          <AlertCircle size={14} className="inline mr-2 text-rose-500" />
                          {apiError}
                        </td>
                      </tr>
                    ) : auditData.map(log => (
                      <tr key={log.id} className="hover:bg-neutral-800/10 transition-all duration-150 group">
                        <td className="py-4 px-4 font-mono text-[#bfff00] font-bold tracking-wide group-hover:text-[#cfff33]">{log.sku}</td>
                        <td className="py-4 px-4 text-neutral-300 font-medium">{log.erp} un</td>
                        <td className="py-4 px-4 text-neutral-300 font-medium">{log.mkt} un</td>
                        <td className="py-4 px-4 text-neutral-400 font-normal">{log.failure}</td>
                        <td className="py-4 px-4 text-right">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold tracking-wide border ${log.status === 'CRITICAL'
                              ? 'bg-rose-950/20 border-rose-900/30 text-rose-400 shadow-[0_0_10px_rgba(239,68,68,0.1)]'
                              : 'bg-lime-950/20 border-lime-900/30 text-[#bfff00] shadow-[0_0_10px_rgba(191,255,0,0.1)]'
                            }`}>
                            <span className={`w-1 h-1 rounded-full ${log.status === 'CRITICAL' ? 'bg-rose-500 animate-pulse' : 'bg-[#bfff00]'}`} />
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : (
          <section className="bg-[#0f1216]/60 backdrop-blur-xl border border-neutral-800/40 rounded-xl p-12 text-center shadow-2xl">
            <Info className="w-8 h-8 text-neutral-600 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-neutral-300 uppercase tracking-wider">Módulo em Desenvolvimento</h3>
            <p className="text-xs text-neutral-500 mt-1 max-w-xs mx-auto">A aba "{activeTab}" está reservada para as futuras automações de rotas e conexões integradas do sistema.</p>
            <p className="text-[10px] text-neutral-400 mt-1">
              Desenvolvimento de novas integrações de APIs (Application Programming Interface) (Interface de Programação de Aplicação).
            </p>
            <button onClick={() => setActiveTab('home')} className="mt-4 text-xs font-semibold text-[#bfff00] hover:text-[#d4ff4d] underline cursor-pointer">Voltar para o Painel Principal</button>
          </section>
        )}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0, 0, 0, 0.15); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(191, 255, 0, 0.15); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(191, 255, 0, 0.3); }
        @keyframes slide-in { from { transform: translateY(-10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .animate-slide-in { animation: slide-in 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
}