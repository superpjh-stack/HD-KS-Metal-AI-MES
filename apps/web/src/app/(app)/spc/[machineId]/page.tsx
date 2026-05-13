'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, RefreshCw } from 'lucide-react';
import { SpcXbarChart, SpcRangeChart, CapabilityTable } from '@ks-mes/ui';
import { useSpcChart } from '@/features/spc/useSpcChart';
import { useCapability } from '@/features/spc/useCapability';
import { useMachines } from '@/features/dashboard/useDashboard';

const CHANNELS = ['vibration_x', 'vibration_y', 'temperature', 'power_kw', 'current', 'pressure', 'spm'];
const HOURS_OPTIONS = [2, 4, 8, 24] as const;

export default function SpcDetailPage() {
  const { machineId } = useParams<{ machineId: string }>();
  const [channel, setChannel]     = useState(CHANNELS[0]);
  const [hoursBack, setHoursBack] = useState<typeof HOURS_OPTIONS[number]>(4);

  const { data: machinesData } = useMachines();
  const machine = machinesData?.data.find((m) => m.id === machineId);

  const {
    data:      chartData,
    isLoading: chartLoading,
    refetch:   refetchChart,
    isFetching,
  } = useSpcChart({ machineId, channel, hoursBack });

  const { data: capabilityData, isLoading: capLoading } = useCapability(machineId);

  const chart  = chartData?.data;
  const capItems = capabilityData?.data ?? [];

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <Link href="/spc" className="text-slate-400 hover:text-slate-600">
          <ChevronLeft size={20} />
        </Link>
        <div>
          <h1 className="page-title">{machine?.machineCode ?? machineId} — SPC</h1>
          <p className="text-xs text-slate-400">{machine?.name}</p>
        </div>
        <button
          onClick={() => void refetchChart()}
          className="ml-auto rounded-md p-1.5 hover:bg-slate-100"
          title="새로고침"
        >
          <RefreshCw size={15} className={isFetching ? 'animate-spin text-blue-500' : 'text-slate-400'} />
        </button>
      </div>

      {/* 필터 바 */}
      <div className="flex flex-wrap gap-3">
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
          {CHANNELS.map((ch) => (
            <button
              key={ch}
              onClick={() => setChannel(ch)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                ch === channel
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {ch}
            </button>
          ))}
        </div>
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
          {HOURS_OPTIONS.map((h) => (
            <button
              key={h}
              onClick={() => setHoursBack(h)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                h === hoursBack
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {h}h
            </button>
          ))}
        </div>
      </div>

      {/* X̄ 관리도 */}
      <div className="section-card">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">
          X̄ 관리도 — {channel}
          {chart && <span className="ml-2 text-xs font-normal text-slate-400">n={chart.sampleSize} · {chart.points.length}개 군</span>}
        </h2>
        {chartLoading ? (
          <div className="h-60 animate-pulse rounded-lg bg-slate-100" />
        ) : chart ? (
          <SpcXbarChart points={chart.points} limits={chart.limits} height={240} />
        ) : (
          <p className="py-10 text-center text-sm text-slate-400">데이터 없음</p>
        )}
      </div>

      {/* R 관리도 */}
      <div className="section-card">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">R 관리도 — {channel}</h2>
        {chartLoading ? (
          <div className="h-40 animate-pulse rounded-lg bg-slate-100" />
        ) : chart ? (
          <SpcRangeChart points={chart.points} limits={chart.limits} height={160} />
        ) : (
          <p className="py-6 text-center text-sm text-slate-400">데이터 없음</p>
        )}
      </div>

      {/* 공정능력 테이블 */}
      <div className="section-card">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">공정능력 (Cp / Cpk)</h2>
        {capLoading ? (
          <div className="h-32 animate-pulse rounded-lg bg-slate-100" />
        ) : (
          <CapabilityTable items={capItems} />
        )}
      </div>
    </div>
  );
}
