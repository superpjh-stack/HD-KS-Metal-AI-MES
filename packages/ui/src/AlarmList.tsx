'use client';

import { AlertTriangle, Info, Flame, CheckCircle2 } from 'lucide-react';
import type { AlarmEvent } from './types';
import { cn } from './lib/utils';

const SEVERITY_CONFIG = {
  CRITICAL: { icon: Flame,          label: '심각', class: 'text-red-600    bg-red-50    border-red-200'    },
  WARNING:  { icon: AlertTriangle,  label: '경고', class: 'text-amber-600  bg-amber-50  border-amber-200'  },
  INFO:     { icon: Info,           label: '정보', class: 'text-blue-600   bg-blue-50   border-blue-200'   },
} as const;

interface AlarmListProps {
  alarms:       AlarmEvent[];
  onAcknowledge?: (id: string) => void;
  isAcknowledging?: string | null;
}

export function AlarmList({ alarms, onAcknowledge, isAcknowledging }: AlarmListProps) {
  if (alarms.length === 0) {
    return (
      <div className="flex flex-col items-center py-10 text-slate-400">
        <CheckCircle2 size={32} className="mb-2 text-emerald-400" />
        <p className="text-sm">미처리 알람이 없습니다.</p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {alarms.map((alarm) => {
        const cfg = SEVERITY_CONFIG[alarm.severity] ?? SEVERITY_CONFIG.INFO;
        const Icon = cfg.icon;
        const acked = !!alarm.acknowledgedAt;

        return (
          <li
            key={alarm.id}
            className={cn(
              'flex items-start gap-3 rounded-lg border p-3',
              acked ? 'border-slate-200 bg-slate-50 opacity-60' : cfg.class,
            )}
          >
            <Icon size={16} className="mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">{alarm.message}</p>
              <p className="mt-0.5 text-[11px] text-slate-500">
                {alarm.channel} · {new Date(alarm.occurredAt).toLocaleString('ko-KR')}
              </p>
              {acked && (
                <p className="text-[11px] text-slate-400">
                  처리: {alarm.acknowledgedBy ?? '—'} · {new Date(alarm.acknowledgedAt!).toLocaleString('ko-KR')}
                </p>
              )}
            </div>
            {!acked && onAcknowledge && (
              <button
                onClick={() => onAcknowledge(alarm.id)}
                disabled={isAcknowledging === alarm.id}
                className="shrink-0 rounded-md bg-white px-2 py-1 text-xs font-medium shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-50"
              >
                {isAcknowledging === alarm.id ? '처리중…' : '확인'}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
