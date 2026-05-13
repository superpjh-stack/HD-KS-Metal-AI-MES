'use client';

import { cn } from '../lib/utils';
import type { MachineStatusBadgeProps } from '../types';

const statusConfig = {
  ACTIVE:      { dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50', label: '가동' },
  WARNING:     { dot: 'bg-amber-500',   text: 'text-amber-700',   bg: 'bg-amber-50',   label: '경고' },
  MAINTENANCE: { dot: 'bg-slate-400',   text: 'text-slate-600',   bg: 'bg-slate-100',  label: '정비' },
  RETIRED:     { dot: 'bg-red-400',     text: 'text-red-600',     bg: 'bg-red-50',     label: '폐기' },
};

export function MachineStatusBadge({ machineCode, status, spm }: MachineStatusBadgeProps) {
  const cfg = statusConfig[status] ?? statusConfig.MAINTENANCE;

  return (
    <div className={cn('flex flex-col items-center rounded-lg border p-3 gap-1 w-28', cfg.bg)}>
      <div className={cn('h-3 w-3 rounded-full animate-pulse', cfg.dot)} />
      <span className="text-xs font-bold text-slate-700">{machineCode}</span>
      <span className={cn('text-xs font-medium', cfg.text)}>{cfg.label}</span>
      {spm !== undefined && (
        <span className="text-xs text-slate-500">{spm} spm</span>
      )}
    </div>
  );
}
