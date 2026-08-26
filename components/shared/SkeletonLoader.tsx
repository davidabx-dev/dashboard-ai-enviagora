// components/shared/SkeletonLoader.tsx
import React from 'react';

export function SkeletonLoader({ rows = 5 }: { rows?: number }) {
  return (
    <div className="w-full space-y-4 animate-pulse">
      {/* Skeleton de Cards Topo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-28 rounded-2xl bg-[#09150d]/80 border border-emerald-500/10 p-5 flex flex-col justify-between"
          >
            <div className="h-3.5 bg-emerald-950/60 rounded w-1/3" />
            <div className="h-8 bg-emerald-900/40 rounded w-1/2" />
            <div className="h-2.5 bg-emerald-950/40 rounded w-2/3" />
          </div>
        ))}
      </div>

      {/* Skeleton de Tabela */}
      <div className="rounded-2xl bg-[#09150d]/80 border border-emerald-500/10 p-6 space-y-3">
        <div className="h-10 bg-emerald-950/60 rounded-xl w-full mb-4" />
        {Array.from({ length: rows }).map((_, idx) => (
          <div key={idx} className="h-12 bg-emerald-950/30 rounded-xl w-full" />
        ))}
      </div>
    </div>
  );
}
