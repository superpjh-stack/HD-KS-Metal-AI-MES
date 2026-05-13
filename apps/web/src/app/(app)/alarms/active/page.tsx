'use client';

import { AlarmList } from '@ks-mes/ui';
import { useAlarmEvents, useAcknowledge } from '@/features/alarms/useAlarmEvents';
import { useAlarmSummary } from '@/features/alarms/useAlarmEvents';
import { Flame } from 'lucide-react';

export default function ActiveAlarmsPage() {
  const { data, isLoading } = useAlarmEvents({ unacknowledgedOnly: 'true' });
  const { data: summaryData }            = useAlarmSummary();
  const { mutate: acknowledge, isPending, variables: ackId } = useAcknowledge();

  const alarms  = data?.data ?? [];
  const summary = summaryData?.data ?? [];

  const criticalCount = summary.filter((s) => s.maxSeverity === 'CRITICAL').reduce((acc, s) => acc + s.count, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="page-title">미처리 알람</h1>
        {criticalCount > 0 && (
          <span className="flex items-center gap-1 rounded-full bg-red-100 px-3 py-0.5 text-sm font-semibold text-red-700">
            <Flame size={13} />
            {criticalCount}건 심각
          </span>
        )}
      </div>

      {/* 설비별 요약 */}
      {summary.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {summary.map((s) => (
            <div
              key={s.machineId}
              className={`rounded-xl border p-3 text-sm ${
                s.maxSeverity === 'CRITICAL'
                  ? 'border-red-200 bg-red-50'
                  : s.maxSeverity === 'WARNING'
                  ? 'border-amber-200 bg-amber-50'
                  : 'border-slate-200 bg-slate-50'
              }`}
            >
              <p className="truncate font-mono text-xs text-slate-500">{s.machineId}</p>
              <p className="mt-1 text-2xl font-bold text-slate-800">{s.count}</p>
              <p className="text-xs text-slate-500">미처리 알람</p>
            </div>
          ))}
        </div>
      )}

      <div className="section-card">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
        ) : (
          <AlarmList
            alarms={alarms}
            onAcknowledge={(id) => acknowledge(id)}
            isAcknowledging={isPending ? ackId ?? null : null}
          />
        )}
      </div>
    </div>
  );
}
