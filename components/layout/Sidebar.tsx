// components/layout/Sidebar.tsx
"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  BarChart3,
  Boxes,
  Star,
  FileText,
  ArrowDownToLine,
  Settings,
  Menu,
} from 'lucide-react';

// =========================================================================
// ⚙️ ÁREA DE CONFIGURAÇÃO DE TAMANHO E POSICIONAMENTO DA LOGO (ENVIAGORA)
// =========================================================================
// Aqui você pode alterar a largura, altura, margens e o arquivo da sua logo:
export const CONFIG_LOGO = {
  // 1. Logo Completa (Quando o menu está ABERTO / EXPANDIDO)
  completo: {
    src: '/img/logo-tech-enviagora-v2.svg', // Arquivo SVG horizontal (ou '/img/logo-enviagora-v2.svg')
    width: '145px',                        // Altere a largura aqui (ex: '130px', '150px', '165px', etc.)
    height: 'auto',                        // Proporção automática
    marginLeft: '6px',                     // Ajuste horizontal de posicionamento
    marginTop: '0px',                      // Ajuste vertical de posicionamento
  },
  // 2. Ícone Seta (Quando o menu está FECHADO / Ícone do botão)
  seta: {
    src: '/img/enviagora-seta.svg',        // Arquivo SVG da seta
    width: '20px',                         // Largura da seta
    height: '20px',                        // Altura da seta
  },
};

export const LogoSeta = () => (
  <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-[#051108] border border-emerald-500/40 shadow-[0_0_12px_rgba(34,197,94,0.35)] group-hover:border-emerald-400 group-hover:shadow-[0_0_16px_rgba(191,255,0,0.5)] transition-all duration-300">
    <img
      src={CONFIG_LOGO.seta.src}
      alt="Seta Enviagora"
      style={{
        width: CONFIG_LOGO.seta.width,
        height: CONFIG_LOGO.seta.height,
      }}
      className="object-contain drop-shadow-[0_0_6px_rgba(196,255,87,0.4)]"
      onError={(e) => {
        e.currentTarget.style.display = 'none';
      }}
    />
  </div>
);

export const LogoCompleto = () => (
  <div
    className="flex items-center select-none"
    style={{
      marginLeft: CONFIG_LOGO.completo.marginLeft,
      marginTop: CONFIG_LOGO.completo.marginTop,
    }}
  >
    <img
      src={CONFIG_LOGO.completo.src}
      alt="Logo Enviagora"
      style={{
        width: CONFIG_LOGO.completo.width,
        height: CONFIG_LOGO.completo.height,
      }}
      className="object-contain drop-shadow-[0_0_10px_rgba(196,255,87,0.2)]"
      onError={(e) => {
        e.currentTarget.onerror = null;
        e.currentTarget.src = '/img/logo-enviagora-v2.svg';
      }}
    />
  </div>
);

export function Sidebar() {
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMenuHovered, setIsMenuHovered] = useState(false);

  const menuItems = [
    { href: '/', icon: Home, label: 'Dashboard Base' },
    { href: '/analytics', icon: BarChart3, label: 'Métricas & Análises' },
    { href: '/skus', icon: Boxes, label: 'Controle de SKUs' },
    { href: '/favorites', icon: Star, label: 'Produtos Favoritos' },
    { href: '/logs', icon: FileText, label: 'Histórico de Logs' },
    { href: '/reports', icon: ArrowDownToLine, label: 'Relatórios Exportados' },
  ];

  const isCurrentActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={`relative hidden sm:flex flex-col justify-between py-5 bg-[#060e08]/95 backdrop-blur-2xl border-r border-emerald-500/20 shrink-0 z-30 sticky top-0 h-screen transition-all duration-300 select-none overflow-hidden ${
        isExpanded ? 'w-64 px-4' : 'w-20 px-2.5'
      }`}
    >
      {/* Luz ambiente suave de fundo */}
      <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Ponto Verde Neon Pulsante (Status Online no Topo Direito quando expandido) */}
      <div
        className={`absolute top-4 right-4 z-20 transition-opacity duration-300 ${
          isExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#bfff00] opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#bfff00] shadow-[0_0_10px_#bfff00]"></span>
        </span>
      </div>

      <div className="relative z-10 flex flex-col w-full">
        {/* Cabeçalho da Barra Lateral com Ícone de Seta / Menu e Logo */}
        <div
          className={`flex items-center w-full pb-3 ${
            isExpanded ? 'px-1 justify-between' : 'justify-center'
          }`}
        >
          {isExpanded ? (
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                onMouseEnter={() => setIsMenuHovered(true)}
                onMouseLeave={() => setIsMenuHovered(false)}
                className="transition-all duration-300 cursor-pointer flex items-center justify-center shrink-0 group"
                title="Recolher Menu"
                aria-label="Recolher Menu Lateral"
              >
                {isMenuHovered ? (
                  <div className="w-9 h-9 rounded-xl bg-emerald-950/50 border border-emerald-500/40 flex items-center justify-center text-[#bfff00] shadow-[0_0_10px_rgba(191,255,0,0.4)]">
                    <Menu size={18} className="rotate-180" />
                  </div>
                ) : (
                  <LogoSeta />
                )}
              </button>
              <Link href="/" className="flex items-center hover:opacity-90 transition-opacity animate-slide-in">
                <LogoCompleto />
              </Link>
            </div>
          ) : (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              onMouseEnter={() => setIsMenuHovered(true)}
              onMouseLeave={() => setIsMenuHovered(false)}
              className="transition-all duration-300 cursor-pointer flex items-center justify-center shrink-0 group mx-auto"
              title="Expandir Menu"
              aria-label="Expandir Menu Lateral"
            >
              {isMenuHovered ? (
                <div className="w-9 h-9 rounded-xl bg-emerald-950/50 border border-emerald-500/40 flex items-center justify-center text-[#bfff00] shadow-[0_0_10px_rgba(191,255,0,0.4)]">
                  <Menu size={18} className="rotate-180" />
                </div>
              ) : (
                <LogoSeta />
              )}
            </button>
          )}
        </div>

        {/* Linha Divisória Fina Iluminada */}
        <div className="w-full h-px bg-gradient-to-r from-transparent via-emerald-500/25 to-transparent my-3" />

        {/* Navegação Vertical de Abas */}
        <nav className="flex flex-col gap-2.5 w-full items-center" aria-label="Menu Principal">
          {menuItems.map((item) => {
            const IconComponent = item.icon;
            const isSelected = isCurrentActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                title={!isExpanded ? item.label : ''}
                className={`group relative flex items-center rounded-2xl transition-all duration-300 ease-out cursor-pointer active:scale-[0.96] ${
                  isExpanded
                    ? 'w-full h-12 justify-start gap-3.5 px-4'
                    : 'w-12 h-12 justify-center p-0 mx-auto'
                } ${
                  isSelected
                    ? 'bg-gradient-to-r from-[#0d2612]/95 via-[#081a0d]/90 to-[#0d2612]/95 text-[#22c55e] border-[1.5px] border-[#22c55e] shadow-[0_0_22px_rgba(34,197,94,0.4),_inset_0_0_12px_rgba(34,197,94,0.18)] font-black'
                    : 'text-neutral-400 border border-transparent hover:text-emerald-300 hover:bg-[#0c2010]/40 hover:border-emerald-500/30 hover:shadow-[0_0_14px_rgba(34,197,94,0.12)] font-semibold'
                }`}
              >
                <IconComponent
                  size={20}
                  className={`transition-transform duration-300 shrink-0 ${
                    isSelected
                      ? 'text-[#22c55e] drop-shadow-[0_0_10px_rgba(34,197,94,0.85)] scale-105'
                      : 'text-neutral-400 group-hover:text-[#22c55e] group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(34,197,94,0.6)]'
                  }`}
                />
                {isExpanded && (
                  <span className="tracking-wide text-xs whitespace-nowrap animate-slide-in">
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Rodapé da Sidebar: Card Operacional + Botão de Configurações */}
      <div className="relative z-10 flex flex-col gap-2.5 w-full pt-2 items-center">
        {isExpanded && (
          <div className="relative w-full overflow-hidden rounded-2xl border border-emerald-500/25 bg-[#09140c]/90 p-3.5 shadow-lg animate-slide-in group mb-1">
            <div className="absolute -top-6 -right-6 w-20 h-20 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
            <div className="relative z-10 flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-white">ENVIAGORA</span>
                <span className="text-[9px] font-extrabold text-[#22c55e] px-1.5 py-0.5 bg-emerald-950/60 rounded border border-emerald-500/30 shadow-[0_0_6px_rgba(34,197,94,0.2)]">
                  PRO
                </span>
              </div>
              <p className="text-[10px] text-neutral-400 font-medium leading-tight">
                Auditoria contínua e conciliação em tempo real.
              </p>
            </div>
          </div>
        )}

        <div
          className={`flex items-center rounded-2xl transition-all duration-300 ease-out cursor-default text-neutral-400 border border-transparent ${
            isExpanded ? 'w-full h-10 justify-start gap-3.5 px-4' : 'w-12 h-10 justify-center p-0 mx-auto'
          }`}
        >
          <Settings size={18} className="shrink-0 text-neutral-500" />
          {isExpanded && (
            <span className="text-xs tracking-wide whitespace-nowrap text-neutral-500 font-medium">
              V2.4 Segura
            </span>
          )}
        </div>
      </div>
    </aside>
  );
}
