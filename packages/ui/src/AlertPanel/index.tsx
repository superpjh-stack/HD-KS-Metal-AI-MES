'use client';

import { AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '../lib/utils';

export interface Alert {
  id: string;
  level: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  time: Date;
}

interface AlertPanelProps {
  alerts: Alert[];
  onDismiss?: (id: string) => void;
}

const levelConfig = {
  info:     { icon: Info,          color: 'text-blue-600',  bg: 'bg-blue-50',  border: 'border-blue-200' },
  warning:  { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  critical: { icon: AlertTriangle, color: 'text-red-600',   bg: 'bg-red-50',   border: 'border-red-200' },
};

export function AlertPanel({ alerts, onDismiss }: AlertPanelProps) {
  if (alerts.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-400">
        새 알림이 없습니다
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {alerts.map((alert) => {
        const { icon: Icon, color, bg, border } = levelConfig[alert.level];
        return (
          <li key={alert.id} className={cn('flex items-start gap-3 rounded-lg border p-3', bg, border)}>
            <Icon size={16} className={cn('mt-0.5 shrink-0', color)} />
            <div className="flex-1 min-w-0">
              <p className={cn('text-xs font-semibold', color)}>{alert.title}</p>
              <p className="text-xs text-slate-600 truncate">{alert.message}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {alert.time.toLocaleTimeString('ko-KR')}
              </p>
            </div>
            {onDismiss && (
              <button onClick={() => onDismiss(alert.id)} className="shrink-0 text-slate-400 hover:text-slate-600">
                <X size={13} />
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
