'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ChevronLeft, RefreshCw, AlertTriangle, Flame, Clock, CheckCircle } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { useMachines } from '@/features/dashboard/useDashboard';
import { usePdmSummary, usePredictions } from '@/features/pdm/usePdm';
import type { MlModelType } from '@/lib/api-client';

// ── KPI card ─────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, color,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  color: 'red' | 'amber' | 'emerald' | 'blue' | 'slate';
}) {
  const cls: Record<string, string> = {
    red:     'border-red-200 bg-red-50',
    amber:   'border-amber-200 bg-amber-50',
    emerald: 'border-emerald-200 bg-emerald-50',
    blue:    'border-blue-200 bg-blue-50',
    slate:   'border-slate-200 bg-white',
  };
  return (
    <div className={`rounded-xl border p-5 ${cls[color]}`}>
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <div className="text-2xl font-bold text-slate-800">{value}</div>
      {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

// ── Gauge-style number ────────────────────────────────────────────

function ProbGauge({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 70 ? 'text-red-600' : pct >= 40 ? 'text-amber-600' : 'text-emerald-600';
  return <span className={`text-2xl font-bold ${color}`}>{pct}%</span>;
}

// ── Prediction trend chart ────────────────────────────────────────

const MODEL_COLORS: Record<MlModelType, string> = {
  AUTOENCODER:  '#6366f1',
  FAILURE_PROB: '#f59e0b',
  RUL:          '#10b981',
};

const MODEL_LABELS: Record<MlModelType, string> = {
  AUTOENCODER:  '재구성 오차',
  FAILURE_PROB: '고장 확률',
  RUL:          '잔여수명 (h)',
};

function PredictionChart({ machineId, modelType }: { machineId: string; modelType: MlModelType }) {
  const { data, isLoading, refetch, isFetching } = usePredictions(machineId, modelType, 60);
  const logs = [...(data?.data ?? [])].reverse();

  const points = logs.map((l) => ({
    time:  new Date(l.predictedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
    score: parseFloat(l.score.toFixed(4)),
    anomaly: l.isAnomaly,
  }));

  return (
    <div className="section-card">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700">
          {MODEL_LABELS[modelType]} 추이
          <span className="ml-2 text-xs font-normal text-slate-400">최근 60회</span>
        </h2>
        <button
          onClick={() => void refetch()}
          className="rounded-md p-1.5 hover:bg-slate-100"
          title="새로고침"
        >
          <RefreshCw size={13} className={isFetching ? 'animate-spin text-blue-500' : 'text-slate-400'} />
        </button>
      </div>

      {isLoading ? (
        <div className="h-36 animate-pulse rounded-lg bg-slate-100" />
      ) : points.length === 0 ? (
        <p className="py-8 text-center text-xs text-slate-400">예측 데이터 없음</p>
      ) : (
        <ResponsiveContainer width="100%" height={144}>
          <LineChart data={points} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="time" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 10 }} width={48} />
            <Tooltip
              contentStyle={{ fontSize: 12 }}
              formatter={(v: number) => [v.toFixed(4), MODEL_LABELS[modelType]]}
            />
            {modelType === 'AUTOENCODER' && (
              <ReferenceLine y={0.05} stroke="#ef4444" strokeDasharray="4 2" label={{ value: '임계값', fontSize: 10 }} />
            )}
            {modelType === 'FAILURE_PROB' && (
              <ReferenceLine y={0.7} stroke="#ef4444" strokeDasharray="4 2" label={{ value: '70%', fontSize: 10 }} />
            )}
            {modelType === 'RUL' && (
              <>
                <ReferenceLine y={72}  stroke="#ef4444" strokeDasharray="4 2" label={{ value: '72h', fontSize: 10 }} />
                <ReferenceLine y={200} stroke="#f59e0b" strokeDasharray="4 2" label={{ value: '200h', fontSize: 10 }} />
              </>
            )}
            <Line
              type="monotone"
              dataKey="score"
              stroke={MODEL_COLORS[modelType]}
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────

const MODEL_TABS: MlModelType[] = ['AUTOENCODER', 'FAILURE_PROB', 'RUL'];
const TAB_LABELS: Record<MlModelType, string> = {
  AUTOENCODER:  'AutoEncoder',
  FAILURE_PROB: '고장 확률',
  RUL:          'RUL',
};

export default function PdmDetailPage() {
  const { machineId } = useParams<{ machineId: string }>();
  const [activeTab, setActiveTab] = useState<MlModelType>('AUTOENCODER');

  const { data: machinesData } = useMachines();
  const machine = machinesData?.data.find((m) => m.id === machineId);

  const { data: summaryData, isLoading: summaryLoading, refetch } = usePdmSummary(machineId);
  const pdm = summaryData?.data;

  // KPI colour logic
  const anomalyColor  = pdm?.anomalyScore?.isAnomaly ? 'red' : 'emerald';
  const failureColor  = (pdm?.failureProbability?.max ?? 0) >= 0.7 ? 'red'
    : (pdm?.failureProbability?.max ?? 0) >= 0.4 ? 'amber' : 'emerald';
  const rulHours = pdm?.rul?.hours;
  const rulColor  = rulHours == null ? 'slate' : rulHours < 72 ? 'red' : rulHours < 200 ? 'amber' : 'emerald';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/pdm" className="text-slate-400 hover:text-slate-600">
          <ChevronLeft size={20} />
        </Link>
        <div>
          <h1 className="page-title">{machine?.machineCode ?? machineId} — 예측정비</h1>
          <p className="text-xs text-slate-400">{machine?.name}</p>
        </div>
        <button
          onClick={() => void refetch()}
          className="ml-auto rounded-md p-1.5 hover:bg-slate-100"
          title="새로고침"
        >
          <RefreshCw size={15} className="text-slate-400" />
        </button>
      </div>

      {/* KPI Cards */}
      {summaryLoading ? (
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-100" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <KpiCard
            label="이상 감지 (AutoEncoder)"
            color={anomalyColor}
            value={
              pdm?.anomalyScore ? (
                <span className="flex items-center gap-2">
                  {pdm.anomalyScore.isAnomaly
                    ? <Flame size={20} className="text-red-500" />
                    : <CheckCircle size={20} className="text-emerald-500" />}
                  {pdm.anomalyScore.score.toFixed(4)}
                </span>
              ) : '—'
            }
            sub={pdm?.anomalyScore ? `갱신: ${new Date(pdm.anomalyScore.updatedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}` : undefined}
          />

          <KpiCard
            label="고장 확률 (24h)"
            color={failureColor}
            value={pdm?.failureProbability ? <ProbGauge value={pdm.failureProbability.max} /> : '—'}
            sub={pdm?.failureProbability ? `채널: ${pdm.failureProbability.channel}` : undefined}
          />

          <KpiCard
            label="잔여수명 (RUL)"
            color={rulColor}
            value={
              rulHours != null ? (
                <span className="flex items-center gap-2">
                  <Clock size={18} className={rulHours < 72 ? 'text-red-500' : rulHours < 200 ? 'text-amber-500' : 'text-emerald-500'} />
                  {rulHours.toFixed(0)}h
                </span>
              ) : '—'
            }
            sub={pdm?.rul ? `트렌드: ${pdm.rul.trend === 'degrading' ? '악화' : pdm.rul.trend === 'improving' ? '개선' : '안정'}` : undefined}
          />
        </div>
      )}

      {/* 경고 배너 */}
      {pdm?.rul && rulHours != null && rulHours < 72 && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-3">
          <Flame size={18} className="text-red-600 shrink-0" />
          <p className="text-sm font-medium text-red-700">
            잔여수명 {rulHours.toFixed(0)}시간 — 즉시 점검 또는 부품 교체가 필요합니다.
          </p>
        </div>
      )}
      {pdm?.anomalyScore?.isAnomaly && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-3">
          <AlertTriangle size={18} className="text-amber-600 shrink-0" />
          <p className="text-sm font-medium text-amber-700">
            비정상 진동 패턴 감지 — AI 재구성 오차가 임계값을 초과했습니다.
          </p>
        </div>
      )}

      {/* 예측 추이 탭 */}
      <div>
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1 w-fit mb-4">
          {MODEL_TABS.map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                t === activeTab
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>
        <PredictionChart machineId={machineId} modelType={activeTab} />
      </div>
    </div>
  );
}
