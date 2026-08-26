// components/layout/Header.tsx
"use client";

import React from 'react';
import { ShieldCheck } from 'lucide-react';

interface HeaderProps {
  title: string;
  highlightWord?: string;
  badgeText?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function Header({
  title,
  highlightWord = 'AI',
  badgeText = 'PRISMA V2.4 SEGURA',
  subtitle = 'Auditoria Operacional • Conciliação de Estoque • Scanner James AI',
  actions,
}: HeaderProps) {
  return (
    <header className="relative w-full overflow-hidden rounded-2xl bg-[#08120a]/90 p-5 sm:p-6 border border-emerald-500/20 shadow-2xl backdrop-blur-md mb-8">
      {/* Luzes ambiente de fundo */}
      <div className="absolute -top-16 -left-16 w-56 h-56 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 right-1/4 w-56 h-56 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col gap-5">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5">
          {/* Lado Esquerdo: Ícone Neon + Título + Badges */}
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)] flex-shrink-0">
              <ShieldCheck className="w-6 h-6 stroke-[2.2] text-[#bfff00]" />
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-lg sm:text-xl font-black tracking-wider text-white select-none">
                  {title} {highlightWord && <span className="text-[#bfff00]">{highlightWord}</span>}
                </h1>
                {badgeText && (
                  <span className="inline-flex items-center px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-[#bfff00] border border-emerald-500/40 rounded-full bg-emerald-950/40 shadow-[0_0_10px_rgba(34,197,94,0.2)]">
                    {badgeText}
                  </span>
                )}
              </div>
              <p className="text-[11px] font-medium text-neutral-400 tracking-wide mt-1">
                {subtitle}
              </p>
            </div>
          </div>

          {/* Lado Direito: Status, Perfil e Ações Customizadas */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950/40 border border-emerald-500/35 text-xs font-semibold text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.15)]">
              <span className="w-2 h-2 rounded-full bg-[#bfff00] shadow-[0_0_8px_#bfff00] animate-pulse" />
              <span>Sincronização Ativa</span>
            </div>

            <div className="flex items-center gap-2.5 pl-1.5 py-1 pr-3 rounded-full bg-neutral-900/70 border border-neutral-800/80 hover:border-emerald-500/40 transition-all duration-200 cursor-pointer">
              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-[#bfff00] text-black font-extrabold text-[11px] shadow-[0_0_10px_rgba(191,255,0,0.3)]">
                DA
              </div>
              <div className="text-left leading-tight hidden sm:block">
                <div className="text-[11px] font-bold text-white">David Admin</div>
                <div className="text-[9px] text-neutral-400">Auditor Chefe</div>
              </div>
            </div>

            {actions && <div className="flex items-center gap-2.5 w-full sm:w-auto">{actions}</div>}
          </div>
        </div>
      </div>
    </header>
  );
}
