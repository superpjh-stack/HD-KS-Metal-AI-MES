'use client';

import Link from 'next/link';
import { useMachines } from '@/features/dashboard/useDashboard';
import { useAlarmSummary } from '@/features/alarms/useAlarmEvents';
import { AlertTriangle, Flame, ChevronRight } from 'lucide-react';

function SeverityBadge({ severity }: { severity: string }) {
  if (severity === 'CRITICAL') {
    return (
      <span className="flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
        <Flame size={11} /> CRITICAL
      </span>
    );
  }
  if (severity === 'WARNING') {
    return (
      <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
        <AlertTriangle size={11} /> WARNING
      </span>
    );
  }
  return (
    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">INFO</span>
  );
}

export default function SpcListPage() {
  const { data: machinesData, isLoading: machinesLoading } = useMachines();
  const { data: summaryData } = useAlarmSummary();

  const machines = machinesData?.data ?? [];
  const summary  = summaryData?.data ?? [];

  const summaryMap = Object.fromEntries(summary.map((s) => [s.machineId, s]));

  return (
    <div className="space-y-6">
      <h1 className="page-title">SPC 공정능력 모니터링</h1>

      {machinesLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : machines.length === 0 ? (
        <p className="py-12 text-center text-sm text-slate-400">등록된 설비가 없습니다.</p>
      ) : (
        <ul className="space-y-2">
          {machines.map((m) => {
            const alarm = summaryMap[m.id];
            return (
              <li key={m.id}>
                <Link
                  href={`/spc/${m.id}`}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition hover:border-blue-300 hover:shadow-md"
                >
                  <div>
                    <p className="font-semibold text-slate-800">{m.machineCode}</p>
                    <p className="text-xs text-slate-400">{m.name} · {m.machineType}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {alarm ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-500">{alarm.count}건</span>
                        <SeverityBadge severity={alarm.maxSeverity} />
                      </div>
                    ) : (
                      <span className="text-xs text-emerald-500">이상 없음</span>
                    )}
                    <ChevronRight size={16} className="text-slate-300" />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
