'use client';

import { use } from 'react';
import Link from 'next/link';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine, Legend,
} from 'recharts';
import { useSpcDrilldown, type SpcResult } from '@/features/quality/useSpcDrilldown';
import { useDefectTrend } from '@/features/quality/useDefectTrend';

const CPK_COLOR: Record<string, string> = {
  CAPABLE:   'text-emerald-600 bg-emerald-50',
  MARGINAL:  'text-amber-600 bg-amber-50',
  INCAPABLE: 'text-red-600 bg-red-50',
};

function cpkStatus(cpk: number | null): 'CAPABLE' | 'MARGINAL' | 'INCAPABLE' | 'NO_DATA' {
  if (cpk == null) return 'NO_DATA';
  if (cpk >= 1.33) return 'CAPABLE';
  if (cpk >= 1.0)  return 'MARGINAL';
  return 'INCAPABLE';
}

function groupByChannel(results: SpcResult[]) {
  const map = new Map<string, SpcResult[]>();
  for (const r of results) {
    if (!map.has(r.channel)) map.set(r.channel, []);
    map.get(r.channel)!.push(r);
  }
  return map;
}

function ChannelChart({ channel, data }: { channel: string; data: SpcResult[] }) {
  const sorted = [...data].sort(
    (a, b) => new Date(a.calculatedAt).getTime() - new Date(b.calculatedAt).getTime(),
  );
  const chartData = sorted.map((r, i) => ({
    i,
    cpk: r.cpk != null ? parseFloat(r.cpk.toFixed(3)) : null,
    xbar: parseFloat(r.xbar.toFixed(4)),
    violation: r.isViolation ? r.cpk : null,
    label: r.calculatedAt.slice(5, 16).replace('T', ' '),
  }));

  const avgCpk = data.reduce((s, r) => s + (r.cpk ?? 0), 0) / data.filter(r => r.cpk != null).length;
  const violations = data.filter(r => r.isViolation).length;
  const status = cpkStatus(isNaN(avgCpk) ? null : avgCpk);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-semibold text-slate-800">{channel}</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            평균 Cpk: {isNaN(avgCpk) ? '—' : avgCpk.toFixed(3)} · 이탈: {violations}건
          </p>
        </div>
        {status !== 'NO_DATA' && (
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${CPK_COLOR[status]}`}>
            {status === 'CAPABLE' ? '적합' : status === 'MARGINAL' ? '주의' : '부적합'}
          </span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="i" hide />
          <YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
          <Tooltip
            contentStyle={{ fontSize: 11 }}
            labelFormatter={(i) => chartData[i as number]?.label ?? ''}
          />
          <ReferenceLine y={1.33} stroke="#10b981" strokeDasharray="4 2" label={{ value: '1.33', position: 'right', fontSize: 9, fill: '#10b981' }} />
          <ReferenceLine y={1.0}  stroke="#f59e0b" strokeDasharray="4 2" label={{ value: '1.0',  position: 'right', fontSize: 9, fill: '#f59e0b' }} />
          <Line type="monotone" dataKey="cpk" stroke="#3b82f6" name="Cpk" dot={false} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function MachineDrilldownPage({ params }: { params: Promise<{ machineId: string }> }) {
  const { machineId } = use(params);
  const { data: spcData, isLoading: spcLoading } = useSpcDrilldown(machineId);
  const { data: trendData, isLoading: trendLoading } = useDefectTrend(machineId, 30);

  const results = spcData?.data?.data ?? [];
  const trend   = trendData?.data ?? [];
  const channels = groupByChannel(results);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/quality" className="text-sm text-slate-400 hover:text-blue-600">← 품질 대시보드</Link>
        <h1 className="text-xl font-bold text-slate-800">설비 SPC 상세</h1>
        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-mono text-slate-500">{machineId}</span>
      </div>

      {/* 30-day alarm trend for this machine */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">최근 30일 알람 추이</h2>
        {trendLoading
          ? <div className="h-36 animate-pulse bg-slate-100 rounded-lg" />
          : trend.length === 0
            ? <p className="py-8 text-center text-xs text-slate-400">알람 데이터 없음</p>
            : (
              <ResponsiveContainer width="100%" height={140}>
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="total"    stroke="#3b82f6" name="전체"    dot={false} />
                  <Line type="monotone" dataKey="critical" stroke="#ef4444" name="CRITICAL" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )
        }
      </div>

      {/* Per-channel SPC charts */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-700">채널별 Cpk 추이</h2>
        {spcLoading
          ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="h-40 animate-pulse bg-slate-100 rounded-lg" />
                </div>
              ))}
            </div>
          )
          : channels.size === 0
            ? (
              <div className="rounded-xl border border-slate-200 bg-white py-12 text-center text-sm text-slate-400">
                SPC 결과 데이터 없음
              </div>
            )
            : (
              <div className="grid gap-4 sm:grid-cols-2">
                {Array.from(channels.entries()).map(([ch, data]) => (
                  <ChannelChart key={ch} channel={ch} data={data} />
                ))}
              </div>
            )
        }
      </div>

      {/* Raw results table */}
      {results.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">최근 SPC 결과 (최대 100건)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-left text-slate-400">
                  <th className="pb-2 font-medium">채널</th>
                  <th className="pb-2 font-medium text-right">X̄</th>
                  <th className="pb-2 font-medium text-right">R̄</th>
                  <th className="pb-2 font-medium text-right">Cpk</th>
                  <th className="pb-2 font-medium text-center">이탈</th>
                  <th className="pb-2 font-medium">유형</th>
                  <th className="pb-2 font-medium">산출일시</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.id} className={`border-b border-slate-50 ${r.isViolation ? 'bg-red-50' : ''}`}>
                    <td className="py-2 font-mono">{r.channel}</td>
                    <td className="py-2 text-right">{r.xbar.toFixed(4)}</td>
                    <td className="py-2 text-right">{r.rbar.toFixed(4)}</td>
                    <td className="py-2 text-right">{r.cpk != null ? r.cpk.toFixed(3) : '—'}</td>
                    <td className="py-2 text-center">
                      {r.isViolation
                        ? <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-red-600">✕</span>
                        : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="py-2 text-slate-500">{r.violationType ?? '—'}</td>
                    <td className="py-2 text-slate-400">{r.calculatedAt.replace('T', ' ').slice(0, 16)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
