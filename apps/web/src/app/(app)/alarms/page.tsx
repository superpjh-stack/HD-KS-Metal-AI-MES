'use client';

import { useState } from 'react';
import { AlarmList } from '@ks-mes/ui';
import { useAlarmEvents, useAcknowledge } from '@/features/alarms/useAlarmEvents';
import { useMachines } from '@/features/dashboard/useDashboard';
import type { AlarmSeverity } from '@/lib/api-client';

const SEVERITY_OPTIONS: Array<{ label: string; value: AlarmSeverity | 'ALL' }> = [
  { label: '전체', value: 'ALL' },
  { label: '심각', value: 'CRITICAL' },
  { label: '경고', value: 'WARNING' },
  { label: '정보', value: 'INFO' },
];

export default function AlarmsPage() {
  const [machineId, setMachineId]   = useState('');
  const [severity, setSeverity]     = useState<AlarmSeverity | 'ALL'>('ALL');

  const { data: machinesData } = useMachines();
  const machines = machinesData?.data ?? [];

  const params: Record<string, string> = {};
  if (machineId) params.machineId = machineId;
  if (severity !== 'ALL') params.severity = severity;

  const { data, isLoading } = useAlarmEvents(params);
  const { mutate: acknowledge, isPending, variables: ackId } = useAcknowledge();

  const alarms = data?.data ?? [];

  return (
    <div className="space-y-6">
      <h1 className="page-title">알람 이력</h1>

      {/* 필터 바 */}
      <div className="flex flex-wrap gap-3">
        {/* 설비 선택 */}
        <select
          value={machineId}
          onChange={(e) => setMachineId(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm"
        >
          <option value="">전체 설비</option>
          {machines.map((m) => (
            <option key={m.id} value={m.id}>{m.machineCode} — {m.name}</option>
          ))}
        </select>

        {/* 중요도 필터 */}
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
          {SEVERITY_OPTIONS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setSeverity(value)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                severity === value
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="section-card">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-100" />)}
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
