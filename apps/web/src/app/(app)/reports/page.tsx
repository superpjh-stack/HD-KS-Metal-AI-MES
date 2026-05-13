'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FileText, Search, Download } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useReport } from '@/features/stats/useStats';

const SEVERITY_COLORS = { critical: '#ef4444', warning: '#f59e0b', info: '#3b82f6' };
const RISK_LABEL: Record<string, string> = { NONE: '정상', LOW: '낮음', HIGH: '높음' };
const RISK_COLOR: Record<string, string> = { NONE: 'text-emerald-600', LOW: 'text-amber-600', HIGH: 'text-red-600' };

function QuickRange({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:border-blue-300 hover:text-blue-700 transition"
    >
      {label}
    </button>
  );
}

function toLocalDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function ReportsPage() {
  const today = new Date();
  const [from, setFrom] = useState(toLocalDate(new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)));
  const [to,   setTo]   = useState(toLocalDate(today));
  const [queried, setQueried] = useState({ from, to });
  const [searched, setSearched] = useState(false);

  const { data, isLoading } = useReport(
    searched ? new Date(queried.from).toISOString() : '',
    searched ? new Date(queried.to + 'T23:59:59').toISOString() : '',
  );
  const report = data?.data;

  const setRange = (daysBack: number) => {
    const f = new Date(today.getTime() - daysBack * 24 * 60 * 60 * 1000);
    setFrom(toLocalDate(f));
    setTo(toLocalDate(today));
  };

  const handleSearch = () => {
    setQueried({ from, to });
    setSearched(true);
  };

  const alarmPieData = report
    ? [
        { name: 'CRITICAL', value: report.alarms.critical, color: SEVERITY_COLORS.critical },
        { name: 'WARNING',  value: report.alarms.warning,  color: SEVERITY_COLORS.warning },
        { name: 'INFO',     value: report.alarms.info,     color: SEVERITY_COLORS.info },
      ].filter((d) => d.value > 0)
    : [];

  const previewParams = report
    ? `?from=${encodeURIComponent(queried.from)}&to=${encodeURIComponent(queried.to)}`
    : '';

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-2">
        <FileText size={22} className="text-blue-600" />
        <h1 className="page-title">리포트</h1>
      </div>

      {/* 기간 선택 */}
      <div className="section-card space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs text-slate-500">시작일</label>
            <input
              type="date"
              value={from}
              max={to}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
            />
          </div>
          <span className="text-slate-400 pb-2">~</span>
          <div>
            <label className="mb-1 block text-xs text-slate-500">종료일</label>
            <input
              type="date"
              value={to}
              min={from}
              max={toLocalDate(today)}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
            />
          </div>
          <button
            onClick={handleSearch}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
          >
            <Search size={14} /> 조회
          </button>
          {report && (
            <Link
              href={`/reports/preview${previewParams}`}
              className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:border-blue-300 hover:text-blue-700 transition"
            >
              <Download size={14} /> PDF 미리보기
            </Link>
          )}
        </div>
        <div className="flex gap-2">
          <QuickRange label="오늘" onClick={() => setRange(0)} />
          <QuickRange label="이번 주 (7일)" onClick={() => setRange(7)} />
          <QuickRange label="이번 달 (30일)" onClick={() => setRange(30)} />
        </div>
      </div>

      {/* 집계 결과 */}
      {!searched ? (
        <p className="py-12 text-center text-sm text-slate-400">기간을 선택하고 조회하세요.</p>
      ) : isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-100" />)}
        </div>
      ) : !report ? (
        <p className="py-12 text-center text-sm text-slate-400">데이터를 불러올 수 없습니다.</p>
      ) : (
        <>
          {/* KPI 카드 */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: '총 알람', value: report.alarms.total, sub: `CRITICAL ${report.alarms.critical}건` },
              { label: '고위험 설비', value: `${report.pdm.highRiskMachines}대`, sub: '고장확률 70% 이상' },
              { label: 'AI 이상 감지', value: `${report.pdm.anomalyCount}건`, sub: 'AutoEncoder 이상' },
              { label: 'SPC 이탈', value: `${report.spc.totalViolations}건`, sub: 'WE 규칙 위반' },
            ].map((k) => (
              <div key={k.label} className="rounded-xl border border-slate-200 bg-white p-4 text-center">
                <p className="text-2xl font-bold text-slate-800">{k.value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{k.label}</p>
                <p className="text-[10px] text-slate-400">{k.sub}</p>
              </div>
            ))}
          </div>

          {/* 알람 분포 + 채널 Top5 */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="section-card">
              <h2 className="mb-3 text-sm font-semibold text-slate-700">알람 심각도 분포</h2>
              {alarmPieData.length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-400">알람 없음</p>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={alarmPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}>
                      {alarmPieData.map((d) => <Cell key={d.name} fill={d.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => [`${v}건`]} contentStyle={{ fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="section-card">
              <h2 className="mb-3 text-sm font-semibold text-slate-700">알람 다발 채널 Top 5</h2>
              {report.alarms.topChannels.length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-400">데이터 없음</p>
              ) : (
                <ul className="space-y-2">
                  {report.alarms.topChannels.map((ch, i) => (
                    <li key={ch.channel} className="flex items-center gap-3">
                      <span className="w-4 text-xs text-slate-400">{i + 1}</span>
                      <span className="flex-1 text-sm text-slate-700">{ch.channel}</span>
                      <span className="text-sm font-semibold text-slate-800">{ch.count}건</span>
                      <div className="w-24 bg-slate-100 rounded-full h-1.5">
                        <div
                          className="bg-blue-500 h-1.5 rounded-full"
                          style={{ width: `${(ch.count / report.alarms.total) * 100}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* 설비별 요약 테이블 */}
          <div className="section-card overflow-x-auto">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">설비별 요약</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs text-slate-400">
                  <th className="pb-2 font-medium">설비</th>
                  <th className="pb-2 font-medium text-center">OEE</th>
                  <th className="pb-2 font-medium text-center">알람</th>
                  <th className="pb-2 font-medium text-center">고장위험</th>
                  <th className="pb-2 font-medium">주요 채널</th>
                </tr>
              </thead>
              <tbody>
                {report.machines.map((m) => (
                  <tr key={m.machineId} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="py-2.5">
                      <p className="font-medium text-slate-800">{m.machineCode}</p>
                      <p className="text-xs text-slate-400">{m.name}</p>
                    </td>
                    <td className="py-2.5 text-center">
                      {m.oee != null ? `${(m.oee * 100).toFixed(1)}%` : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="py-2.5 text-center">{m.alarmCount}건</td>
                    <td className={`py-2.5 text-center font-medium ${RISK_COLOR[m.pdmRisk]}`}>
                      {RISK_LABEL[m.pdmRisk]}
                    </td>
                    <td className="py-2.5 text-slate-500 text-xs">{m.topChannel ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
