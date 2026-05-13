'use client';

import { useSearchParams } from 'next/navigation';
import { Printer, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useReport } from '@/features/stats/useStats';

const RISK_LABEL: Record<string, string> = { NONE: '정상', LOW: '낮음', HIGH: '높음' };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8 print:mb-6">
      <h2 className="mb-3 border-b border-slate-300 pb-1 text-base font-bold text-slate-800 print:text-sm">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function ReportPreviewPage() {
  const params = useSearchParams();
  const from = params.get('from') ?? '';
  const to   = params.get('to')   ?? '';

  const { data, isLoading } = useReport(
    from ? new Date(from).toISOString() : '',
    to   ? new Date(to + 'T23:59:59').toISOString() : '',
  );
  const report = data?.data;

  if (!from || !to) {
    return (
      <div className="py-20 text-center text-sm text-slate-400">
        잘못된 접근입니다. 리포트 페이지에서 기간을 선택하세요.
      </div>
    );
  }

  return (
    <>
      {/* 화면용 툴바 — 인쇄 시 숨김 */}
      <div className="mb-6 flex items-center gap-3 print:hidden">
        <Link href="/reports" className="flex items-center gap-1 text-sm text-slate-500 hover:text-blue-600">
          <ArrowLeft size={14} /> 돌아가기
        </Link>
        <span className="flex-1" />
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
        >
          <Printer size={14} /> 인쇄 / PDF 저장
        </button>
      </div>

      {/* 리포트 본문 */}
      <div className="mx-auto max-w-3xl space-y-0 rounded-xl border border-slate-200 bg-white p-10 shadow-sm print:rounded-none print:border-none print:shadow-none">

        {/* 표지 */}
        <div className="mb-10 text-center print:mb-8">
          <p className="text-xs uppercase tracking-widest text-slate-400">AI-MES 제조 실행 시스템</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900 print:text-xl">
            생산 현황 분석 리포트
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {from} ~ {to}
          </p>
          <p className="mt-3 text-xs text-slate-400">
            생성일: {new Date().toLocaleDateString('ko-KR')}
          </p>
          <div className="mt-4 border-t border-slate-200" />
        </div>

        {isLoading && (
          <div className="space-y-4 py-10">
            {[1, 2, 3].map((i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />)}
          </div>
        )}

        {report && (
          <>
            {/* 1. 요약 KPI */}
            <Section title="1. 핵심 지표 요약">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: '총 알람',       value: String(report.alarms.total) },
                  { label: 'CRITICAL 알람', value: String(report.alarms.critical) },
                  { label: 'AI 이상 감지',  value: `${report.pdm.anomalyCount}건` },
                  { label: 'SPC 이탈',      value: `${report.spc.totalViolations}건` },
                ].map((k) => (
                  <div key={k.label} className="rounded-lg border border-slate-200 p-3 text-center">
                    <p className="text-xl font-bold text-slate-800">{k.value}</p>
                    <p className="text-xs text-slate-500">{k.label}</p>
                  </div>
                ))}
              </div>
            </Section>

            {/* 2. 알람 분석 */}
            <Section title="2. 알람 분석">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs text-slate-400">
                    <th className="pb-2 font-medium">심각도</th>
                    <th className="pb-2 font-medium text-right">건수</th>
                    <th className="pb-2 font-medium text-right">비율</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: 'CRITICAL', count: report.alarms.critical, color: 'text-red-600' },
                    { label: 'WARNING',  count: report.alarms.warning,  color: 'text-amber-600' },
                    { label: 'INFO',     count: report.alarms.info,     color: 'text-blue-600' },
                  ].map((row) => (
                    <tr key={row.label} className="border-b border-slate-50">
                      <td className={`py-2 font-medium ${row.color}`}>{row.label}</td>
                      <td className="py-2 text-right">{row.count}건</td>
                      <td className="py-2 text-right text-slate-500">
                        {report.alarms.total > 0
                          ? `${((row.count / report.alarms.total) * 100).toFixed(1)}%`
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {report.alarms.topChannels.length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-xs font-semibold text-slate-500">다발 채널 Top 5</p>
                  <table className="w-full text-sm">
                    <tbody>
                      {report.alarms.topChannels.map((ch, i) => (
                        <tr key={ch.channel} className="border-b border-slate-50">
                          <td className="py-1.5 text-xs text-slate-400">{i + 1}</td>
                          <td className="py-1.5">{ch.channel}</td>
                          <td className="py-1.5 text-right font-semibold">{ch.count}건</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>

            {/* 3. 예측정비(PDM) */}
            <Section title="3. 예측정비 AI 분석">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: '이상 감지 건수',  value: `${report.pdm.anomalyCount}건` },
                  { label: '고위험 설비',      value: `${report.pdm.highRiskMachines}대` },
                  { label: '평균 잔여수명',    value: report.pdm.avgRulHours != null ? `${report.pdm.avgRulHours.toFixed(0)}h` : '—' },
                ].map((k) => (
                  <div key={k.label} className="rounded-lg border border-slate-200 p-3 text-center">
                    <p className="text-lg font-bold text-slate-800">{k.value}</p>
                    <p className="text-xs text-slate-500">{k.label}</p>
                  </div>
                ))}
              </div>
            </Section>

            {/* 4. 설비별 종합 */}
            <Section title="4. 설비별 종합 현황">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs text-slate-400">
                    <th className="pb-2 font-medium">설비</th>
                    <th className="pb-2 font-medium text-center">OEE</th>
                    <th className="pb-2 font-medium text-center">알람</th>
                    <th className="pb-2 font-medium text-center">고장위험</th>
                    <th className="pb-2 font-medium">주요 채널</th>
                  </tr>
                </thead>
                <tbody>
                  {report.machines.map((m) => (
                    <tr key={m.machineId} className="border-b border-slate-50">
                      <td className="py-2">
                        <p className="font-medium text-slate-800">{m.machineCode}</p>
                        <p className="text-xs text-slate-400">{m.name}</p>
                      </td>
                      <td className="py-2 text-center">
                        {m.oee != null ? `${(m.oee * 100).toFixed(1)}%` : '—'}
                      </td>
                      <td className="py-2 text-center">{m.alarmCount}건</td>
                      <td className="py-2 text-center text-xs">{RISK_LABEL[m.pdmRisk]}</td>
                      <td className="py-2 text-xs text-slate-500">{m.topChannel ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>

            {/* 5. SPC */}
            <Section title="5. SPC 품질 분석">
              <p className="text-sm text-slate-600">
                총 <span className="font-semibold">{report.spc.totalViolations}건</span>의 Western Electric 규칙 위반이 감지되었습니다.
              </p>
              {report.spc.topMachines.length > 0 && (
                <table className="mt-3 w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs text-slate-400">
                      <th className="pb-2 font-medium">설비</th>
                      <th className="pb-2 font-medium text-right">위반 건수</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.spc.topMachines.map((m) => (
                      <tr key={m.machineCode} className="border-b border-slate-50">
                        <td className="py-1.5">{m.machineCode}</td>
                        <td className="py-1.5 text-right font-semibold">{m.count}건</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Section>

            {/* 푸터 */}
            <div className="mt-10 border-t border-slate-200 pt-4 text-center text-xs text-slate-400">
              HD-KS Metal AI-MES · (주)광성정밀 · {new Date().getFullYear()}
            </div>
          </>
        )}
      </div>

      <style>{`
        @media print {
          body { background: white; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </>
  );
}
