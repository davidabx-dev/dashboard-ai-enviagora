// components/shared/PaginationControls.tsx
"use client";

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}

export function PaginationControls({
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div
      className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-emerald-500/15"
      role="navigation"
      aria-label="Controles de Paginação"
    >
      <span className="text-xs font-semibold text-neutral-400">
        Mostrando página <strong className="text-white">{currentPage}</strong> de{' '}
        <strong className="text-white">{totalPages}</strong> ({totalItems} registros)
      </span>

      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="flex items-center justify-center w-8 h-8 rounded-xl bg-neutral-900/80 border border-emerald-500/20 text-neutral-300 hover:text-white hover:border-emerald-500/40 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
          aria-label="Página anterior"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {Array.from({ length: Math.min(5, totalPages) }).map((_, idx) => {
          let pageNum = idx + 1;
          if (totalPages > 5 && currentPage > 3) {
            pageNum = currentPage - 3 + idx;
            if (pageNum > totalPages) pageNum = totalPages - (4 - idx);
          }

          const isActive = pageNum === currentPage;

          return (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              className={`flex items-center justify-center w-8 h-8 rounded-xl text-xs font-black transition-all cursor-pointer ${
                isActive
                  ? 'bg-emerald-950/80 text-[#22c55e] border border-emerald-500/60 shadow-[0_0_10px_rgba(34,197,94,0.25)]'
                  : 'bg-neutral-900/60 text-neutral-400 border border-neutral-800 hover:text-white hover:border-emerald-500/30'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              {pageNum}
            </button>
          );
        })}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="flex items-center justify-center w-8 h-8 rounded-xl bg-neutral-900/80 border border-emerald-500/20 text-neutral-300 hover:text-white hover:border-emerald-500/40 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
          aria-label="Próxima página"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
