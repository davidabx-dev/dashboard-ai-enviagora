// components/shared/EmptyState.tsx
import React from 'react';
import { LucideIcon, Sparkles } from 'lucide-react';
import Link from 'next/link';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionText?: string;
  actionHref?: string;
  onActionClick?: () => void;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionText,
  actionHref,
  onActionClick,
}: EmptyStateProps) {
  return (
    <div className="relative flex flex-col items-center justify-center p-10 sm:p-14 rounded-2xl bg-[#060f08]/85 border border-emerald-500/20 shadow-2xl backdrop-blur-md text-center overflow-hidden">
      <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-[#22c55e] shadow-[0_0_20px_rgba(34,197,94,0.2)] mb-4">
        <Icon className="w-8 h-8 stroke-[2]" />
      </div>

      <h3 className="relative z-10 text-base sm:text-lg font-black text-white tracking-wide">
        {title}
      </h3>

      <p className="relative z-10 text-xs sm:text-sm text-neutral-400 max-w-md mt-1.5 leading-relaxed font-medium">
        {description}
      </p>

      {actionText && (
        <div className="relative z-10 mt-6">
          {actionHref ? (
            <Link
              href={actionHref}
              className="inline-flex items-center gap-2 bg-[#22c55e] text-black hover:bg-[#1ea850] px-5 h-10 rounded-xl text-xs font-black transition-all active:scale-[0.98] shadow-[0_0_15px_rgba(34,197,94,0.3)]"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {actionText}
            </Link>
          ) : (
            <button
              onClick={onActionClick}
              className="inline-flex items-center gap-2 bg-[#22c55e] text-black hover:bg-[#1ea850] px-5 h-10 rounded-xl text-xs font-black transition-all active:scale-[0.98] shadow-[0_0_15px_rgba(34,197,94,0.3)] cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {actionText}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
