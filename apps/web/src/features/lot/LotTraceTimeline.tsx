'use client';

import { Package, Factory, Truck, CheckCircle, XCircle, FlaskConical, Play } from 'lucide-react';
import { cn } from '@ks-mes/ui';
import type { LotTraceResult } from '@/lib/api-client';

const EVENT_CONFIG: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  INBOUND:       { icon: Package,     label: '입고',      color: 'bg-blue-500' },
  INSPECTION:    { icon: FlaskConical, label: '검사',     color: 'bg-amber-500' },
  PROCESS_START: { icon: Play,        label: '공정 시작', color: 'bg-emerald-500' },
  PROCESS_END:   { icon: CheckCircle, label: '공정 완료', color: 'bg-emerald-600' },
  QUALITY_CHECK: { icon: CheckCircle, label: '품질 검사', color: 'bg-purple-500' },
  SHIPMENT:      { icon: Truck,       label: '출하',      color: 'bg-slate-500' },
  REJECT:        { icon: XCircle,     label: '불량 처리', color: 'bg-red-500' },
};

interface LotTraceTimelineProps {
  events: LotTraceResult['events'];
}

export function LotTraceTimeline({ events }: LotTraceTimelineProps) {
  if (events.length === 0) {
    return <p className="text-sm text-slate-400">이벤트 이력이 없습니다.</p>;
  }

  return (
    <ol className="relative ml-3 border-l border-slate-200">
      {events.map((event, idx) => {
        const cfg = EVENT_CONFIG[event.eventType] ?? {
          icon: Factory,
          label: event.eventType,
          color: 'bg-slate-400',
        };
        const Icon = cfg.icon;

        return (
          <li key={event.id} className={cn('mb-6 ml-6', idx === events.length - 1 && 'mb-0')}>
            {/* 타임라인 아이콘 */}
            <span
              className={cn(
                'absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-white',
                cfg.color,
              )}
            >
              <Icon size={12} className="text-white" />
            </span>

            <div className="rounded-lg border border-slate-100 bg-white p-3 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-semibold text-slate-800">{cfg.label}</span>
                <time className="shrink-0 text-xs text-slate-400">
                  {new Date(event.occurredAt).toLocaleString('ko-KR', {
                    month: '2-digit', day: '2-digit',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </time>
              </div>

              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                {event.machine && (
                  <span>설비: <strong className="text-slate-700">{event.machine.machineCode}</strong></span>
                )}
                {event.workOrder && (
                  <span>작업지시: <strong className="text-slate-700">{event.workOrder.woNumber}</strong></span>
                )}
                {event.operator && (
                  <span>작업자: <strong className="text-slate-700">{event.operator.name}</strong></span>
                )}
              </div>

              {Boolean(event.payload) && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-blue-500 hover:underline">
                    상세 데이터 보기
                  </summary>
                  <pre className="mt-1.5 overflow-x-auto rounded bg-slate-50 p-2 text-xs text-slate-600">
                    {String(JSON.stringify(event.payload, null, 2))}
                  </pre>
                </details>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
