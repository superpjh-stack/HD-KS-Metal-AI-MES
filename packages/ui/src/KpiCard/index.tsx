'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '../lib/utils';
import type { KpiCardProps } from '../types';

export function KpiCard({ title, value, unit, trend, trendValue, status = 'normal' }: KpiCardProps) {
  const statusColor = {
    normal: 'border-slate-200',
    warning: 'border-amber-400',
    critical: 'border-red-500',
  }[status];

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-red-500' : 'text-slate-400';

  return (
    <div className={cn('rounded-xl border-2 bg-white p-5 shadow-sm', statusColor)}>
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-3xl font-bold text-slate-900">{value}</span>
        {unit && <span className="text-sm text-slate-500">{unit}</span>}
      </div>
      {trendValue && (
        <div className={cn('mt-2 flex items-center gap-1 text-xs font-medium', trendColor)}>
          <TrendIcon size={13} />
          <span>{trendValue}</span>
        </div>
      )}
    </div>
  );
}
