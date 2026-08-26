// components/shared/StatCard.tsx
import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'emerald' | 'rose' | 'amber';
  badge?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'emerald',
  badge,
}: StatCardProps) {
  const isRose = variant === 'rose';
  const isAmber = variant === 'amber';

  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-5 sm:p-6 border backdrop-blur-md transition-all duration-300 hover:scale-[1.01] group ${
        isRose
          ? 'bg-gradient-to-br from-[#240a0f]/90 via-[#120406]/90 to-[#0a0203]/95 border-rose-500/25 hover:border-rose-500/40 shadow-[0_0_25px_rgba(244,63,94,0.1)]'
          : isAmber
          ? 'bg-gradient-to-br from-[#241a0a]/90 via-[#120c04]/90 to-[#0a0602]/95 border-amber-500/25 hover:border-amber-500/40 shadow-[0_0_25px_rgba(245,158,11,0.1)]'
          : 'bg-gradient-to-br from-[#0c2612]/90 via-[#06140a]/90 to-[#030a05]/95 border-emerald-500/25 hover:border-emerald-500/40 shadow-[0_0_25px_rgba(34,197,94,0.1)]'
      }`}
    >
      {/* Luz ambiente no fundo do card */}
      <div
        className={`absolute -top-10 -right-10 w-36 h-36 rounded-full blur-2xl pointer-events-none transition-opacity duration-500 group-hover:opacity-100 opacity-60 ${
          isRose ? 'bg-rose-500/15' : isAmber ? 'bg-amber-500/15' : 'bg-emerald-500/15'
        }`}
      />

      <div className="relative z-10 flex items-start justify-between">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-bold uppercase tracking-wider ${
                isRose ? 'text-rose-300/80' : isAmber ? 'text-amber-300/80' : 'text-neutral-400'
              }`}
            >
              {title}
            </span>
            {badge && (
              <span
                className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full border ${
                  isRose
                    ? 'bg-rose-950/60 text-rose-400 border-rose-500/40'
                    : 'bg-emerald-950/60 text-[#22c55e] border-emerald-500/40'
                }`}
              >
                {badge}
              </span>
            )}
          </div>

          <div
            className={`text-3xl sm:text-4xl font-black tracking-tight ${
              isRose ? 'text-rose-400' : isAmber ? 'text-amber-400' : 'text-white'
            }`}
          >
            {value}
          </div>

          {subtitle && (
            <p
              className={`text-[11px] font-semibold mt-1 flex items-center gap-1.5 ${
                isRose ? 'text-rose-400' : isAmber ? 'text-amber-400' : 'text-[#22c55e]'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isRose ? 'bg-rose-400' : isAmber ? 'bg-amber-400' : 'bg-[#22c55e]'
                }`}
              />
              {subtitle}
            </p>
          )}
        </div>

        {/* Caixa do Ícone com Glow Neon */}
        <div
          className={`flex items-center justify-center w-12 h-12 rounded-2xl border shadow-lg shrink-0 transition-transform duration-300 group-hover:scale-105 ${
            isRose
              ? 'bg-rose-950/50 border-rose-500/35 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.2)]'
              : isAmber
              ? 'bg-amber-950/50 border-amber-500/35 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
              : 'bg-emerald-950/50 border-emerald-500/35 text-[#22c55e] shadow-[0_0_15px_rgba(34,197,94,0.2)]'
          }`}
        >
          <Icon className="w-6 h-6 stroke-[2.2]" />
        </div>
      </div>
    </div>
  );
}
