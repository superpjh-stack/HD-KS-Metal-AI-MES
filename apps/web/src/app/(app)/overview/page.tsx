'use client';

import Link from 'next/link';
import { RefreshCw, Flame, AlertTriangle, CheckCircle, Activity, Clock } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { useOverview } from '@/features/stats/useStats';
import { useAlarmEvents } from '@/features/alarms/useAlarmEvents';
import type { OverviewItem } from '@/lib/api-client';

// ── 위험도 색상 ────────────────────────────────────────────────

const RISK_BORDER: Record<string, string> = {
  CRITICAL: 'border-red-400 bg-red-50',
  WARNING:  'border-amber-400 bg-amber-50',
  NORMAL:   'border-slate-200 bg-white',
};

const SEVERITY_ICON: Record<string, React.ReactNode> = {
  CRITICAL: <Flame size={14} className="text-red-500" />,
  WARNING:  <AlertTriangle size={14} className="text-amber-500" />,
  INFO:     <AlertTriangle size={14} className="text-blue-400" />,
  NONE:     <CheckCircle size={14} className="text-emerald-500" />,
};

// ── 요약 배지 ──────────────────────────────────────────────────

function SummaryBadge({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className={`rounded-xl border px-5 py-3 text-center ${color}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}

// ── 설비 카드 ──────────────────────────────────────────────────

function MachineCard({ item }: { item: OverviewItem }) {
  return (
    <div className={`rounded-xl border-2 p-4 space-y-3 ${RISK_BORDER[item.riskLevel]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="font-bold text-slate-800">{item.machineCode}</p>
          <p className="text-xs text-slate-400">{item.name}</p>
        </div>
        <span>{SEVERITY_ICON[item.maxAlarmSeverity]}</span>
      </div>

      <div className="grid grid-cols-2 gap-1 text-xs">
        <div>
          <span className="text-slate-400">알람</span>
          <span className="ml-1 font-semibold text-slate-700">{item.alarmCount}건</span>
        </div>
        <div>
          <span className="text-slate-400">SPC 이탈</span>
          <span className="ml-1 font-semibold text-slate-700">{item.spcViolations}건</span>
        </div>
        <div>
          <span className="text-slate-400">고장확률</span>
          <span className={`ml-1 font-semibold ${(item.pdmFailureProb ?? 0) >= 0.7 ? 'text-red-600' : 'text-slate-700'}`}>
            {item.pdmFailureProb != null ? `${(item.pdmFailureProb * 100).toFixed(0)}%` : '—'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Clock size={10} className="text-slate-400" />
          <span className={`font-semibold text-xs ${(item.pdmRulHours ?? 999) < 72 ? 'text-red-600' : 'text-slate-700'}`}>
            {item.pdmRulHours != null ? `${item.pdmRulHours.toFixed(0)}h` : '—'}
          </span>
        </div>
      </div>

      <div className="flex gap-1">
        <Link
          href={`/spc/${item.machineId}`}
          className="flex-1 rounded-md bg-slate-100 py-1 text-center text-xs text-slate-600 hover:bg-blue-50 hover:text-blue-700 transition"
        >
          SPC
        </Link>
        <Link
          href={`/pdm/${item.machineId}`}
          className="flex-1 rounded-md bg-slate-100 py-1 text-center text-xs text-slate-600 hover:bg-blue-50 hover:text-blue-700 transition"
        >
          PDM
        </Link>
      </div>
    </div>
  );
}

// ── PDM Top5 차트 ──────────────────────────────────────────────

function PdmTop5({ items }: { items: OverviewItem[] }) {
  const top5 = [...items]
    .filter((i) => i.pdmFailureProb != null)
    .sort((a, b) => (b.pdmFailureProb ?? 0) - (a.pdmFailureProb ?? 0))
    .slice(0, 5)
    .map((i) => ({ name: i.machineCode, value: parseFloat(((i.pdmFailureProb ?? 0) * 100).toFixed(1)) }));

  if (!top5.length) return <p className="py-6 text-center text-xs text-slate-400">PDM 데이터 없음</p>;

  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={top5} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={60} />
        <Tooltip formatter={(v: number) => [`${v}%`, '고장 확률']} contentStyle={{ fontSize: 12 }} />
        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
          {top5.map((entry) => (
            <Cell key={entry.name} fill={entry.value >= 70 ? '#ef4444' : entry.value >= 40 ? '#f59e0b' : '#10b981'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Page ──────────────────────────────────────────────────────

export default function OverviewPage() {
  const { data, isLoading, refetch, isFetching, dataUpdatedAt } = useOverview();
  const { data: alarmData } = useAlarmEvents({ limit: '10' });

  const items      = data?.data ?? [];
  const criticalN  = items.filter((i) => i.riskLevel === 'CRITICAL').length;
  const warningN   = items.filter((i) => i.riskLevel === 'WARNING').length;
  const totalAlarms = items.reduce((s, i) => s + i.alarmCount, 0);
  const recentAlarms = alarmData?.data ?? [];
  const updatedTime  = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—';

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <Activity size={22} className="text-blue-600" />
        <h1 className="page-title">AI 통합 현황</h1>
        <span className="text-xs text-slate-400 ml-1">갱신: {updatedTime}</span>
        <button onClick={() => void refetch()} className="ml-auto rounded-md p-1.5 hover:bg-slate-100">
          <RefreshCw size={14} className={isFetching ? 'animate-spin text-blue-500' : 'text-slate-400'} />
        </button>
      </div>

      {/* 요약 배지 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryBadge label="전체 설비" value={items.length} color="border border-slate-200 bg-white" />
        <SummaryBadge label="CRITICAL" value={criticalN} color={criticalN > 0 ? 'border border-red-200 bg-red-50 text-red-700' : 'border border-slate-200 bg-white'} />
        <SummaryBadge label="WARNING" value={warningN} color={warningN > 0 ? 'border border-amber-200 bg-amber-50 text-amber-700' : 'border border-slate-200 bg-white'} />
        <SummaryBadge label="24h 알람" value={totalAlarms} color="border border-slate-200 bg-white" />
      </div>

      {/* 설비 그리드 + 사이드 패널 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* 설비 그리드 */}
        <div className="lg:col-span-2">
          {isLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[1,2,3,4,5,6].map((i) => <div key={i} className="h-40 animate-pulse rounded-xl bg-slate-100" />)}
            </div>
          ) : items.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-400">등록된 설비가 없습니다.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {items.map((item) => <MachineCard key={item.machineId} item={item} />)}
            </div>
          )}
        </div>

        {/* 사이드 패널 */}
        <div className="space-y-4">
          {/* 최근 알람 피드 */}
          <div className="section-card">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">최근 알람</h2>
            {recentAlarms.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">알람 없음</p>
            ) : (
              <ul className="space-y-2">
                {recentAlarms.slice(0, 8).map((a) => (
                  <li key={a.id} className="flex items-start gap-2 text-xs">
                    <span className="mt-0.5 shrink-0">{SEVERITY_ICON[a.severity]}</span>
                    <div className="min-w-0">
                      <p className="truncate text-slate-700">{a.message}</p>
                      <p className="text-slate-400">
                        {a.channel} · {new Date(a.occurredAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* PDM 위험 설비 Top5 */}
          <div className="section-card">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">PDM 위험 Top 5</h2>
            <PdmTop5 items={items} />
          </div>
        </div>
      </div>
    </div>
  );
}
