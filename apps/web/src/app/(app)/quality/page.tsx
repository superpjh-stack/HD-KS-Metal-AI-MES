'use client';

import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from 'recharts';
import { useQualitySummary, type MachineCapability } from '@/features/quality/useQualitySummary';
import { useDefectTrend } from '@/features/quality/useDefectTrend';
import Link from 'next/link';

const CPK_COLOR: Record<string, string> = {
  CAPABLE:   'text-emerald-600 bg-emerald-50',
  MARGINAL:  'text-amber-600 bg-amber-50',
  INCAPABLE: 'text-red-600 bg-red-50',
  NO_DATA:   'text-gray-400 bg-gray-50',
};
const CPK_LABEL: Record<string, string> = {
  CAPABLE: '적합 (≥1.33)', MARGINAL: '주의 (1.0-1.33)', INCAPABLE: '부적합 (<1.0)', NO_DATA: '데이터 없음',
};

const RANGE_OPTIONS = [
  { label: '7일', days: 7 },
  { label: '30일', days: 30 },
  { label: '90일', days: 90 },
];

function CapabilityRow({ m, onDrilldown }: { m: MachineCapability; onDrilldown: (id: string) => void }) {
  return (
    <tr className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer" onClick={() => onDrilldown(m.machineId)}>
      <td className="py-3">
        <p className="font-medium text-slate-800">{m.machineCode}</p>
        <p className="text-xs text-slate-400">{m.name}</p>
      </td>
      <td className="py-3 text-center">
        {m.avgCpk != null ? m.avgCpk.toFixed(3) : <span className="text-slate-300">—</span>}
      </td>
      <td className="py-3 text-center">{m.violations}</td>
      <td className="py-3 text-center">
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${CPK_COLOR[m.status]}`}>
          {CPK_LABEL[m.status]}
        </span>
      </td>
      <td className="py-3 text-center text-blue-600 text-xs">상세 →</td>
    </tr>
  );
}

export default function QualityPage() {
  const [days, setDays] = useState(7);
  const to = new Date().toISOString().slice(0, 10);
  const from = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);

  const { data: summary, isLoading: sumLoading } = useQualitySummary(from, to);
  const { data: trend,   isLoading: trendLoading } = useDefectTrend(undefined, days);

  const kpi = summary?.data?.kpi;
  const machines = summary?.data?.machineCapability ?? [];
  const trendData = trend?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">품질 분석 대시보드</h1>
        <div className="flex gap-2">
          {RANGE_OPTIONS.map((r) => (
            <button
              key={r.days}
              onClick={() => setDays(r.days)}
              className={`rounded-lg px-3 py-1.5 text-sm transition ${
                days === r.days ? 'bg-blue-600 text-white' : 'border border-slate-200 text-slate-600 hover:border-blue-300'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: '총 알람',     value: kpi?.totalAlarms    ?? '—' },
          { label: 'CRITICAL',  value: kpi?.criticalAlarms  ?? '—' },
          { label: 'SPC 이탈',  value: kpi?.totalViolations ?? '—' },
          { label: '평균 Cpk',  value: kpi?.avgCpk != null ? kpi.avgCpk.toFixed(3) : '—' },
        ].map((k) => (
          <div key={k.label} className="rounded-xl border border-slate-200 bg-white p-4 text-center">
            <p className="text-2xl font-bold text-slate-800">{k.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Defect Trend Chart */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">일별 알람 추이</h2>
        {trendLoading
          ? <div className="h-48 animate-pulse bg-slate-100 rounded-lg" />
          : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="total" stroke="#3b82f6" name="전체" dot={false} />
                <Line type="monotone" dataKey="critical" stroke="#ef4444" name="CRITICAL" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )
        }
      </div>

      {/* Cp/Cpk Table */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">설비별 공정능력 (Cp/Cpk)</h2>
        {sumLoading
          ? <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-10 animate-pulse bg-slate-100 rounded" />)}</div>
          : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs text-slate-400">
                  <th className="pb-2 font-medium">설비</th>
                  <th className="pb-2 font-medium text-center">평균 Cpk</th>
                  <th className="pb-2 font-medium text-center">SPC 이탈</th>
                  <th className="pb-2 font-medium text-center">상태</th>
                  <th className="pb-2 font-medium text-center">상세</th>
                </tr>
              </thead>
              <tbody>
                {machines.length === 0
                  ? <tr><td colSpan={5} className="py-8 text-center text-slate-400 text-xs">데이터 없음</td></tr>
                  : machines.map((m) => (
                    <CapabilityRow
                      key={m.machineId}
                      m={m}
                      onDrilldown={() => window.location.href = `/quality/${m.machineId}`}
                    />
                  ))
                }
              </tbody>
            </table>
          )
        }
      </div>
    </div>
  );
}
