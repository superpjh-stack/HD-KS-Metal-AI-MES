'use client';

import Link from 'next/link';
import { Activity, ChevronRight, AlertTriangle, Flame, Clock } from 'lucide-react';
import { useMachines } from '@/features/dashboard/useDashboard';
import { usePdmSummary } from '@/features/pdm/usePdm';
import { useModelStatus } from '@/features/pdm/usePdm';
import type { MachineSummary } from '@/lib/api-client';

function TrendBadge({ trend }: { trend: string }) {
  if (trend === 'degrading') return <span className="text-xs text-red-600 font-medium">악화</span>;
  if (trend === 'improving') return <span className="text-xs text-emerald-600 font-medium">개선</span>;
  return <span className="text-xs text-slate-400">안정</span>;
}

function MachinePdmRow({ machine }: { machine: MachineSummary }) {
  const { data } = usePdmSummary(machine.id);
  const pdm = data?.data;

  const hasAnomaly     = pdm?.anomalyScore?.isAnomaly;
  const failureMax     = pdm?.failureProbability?.max ?? 0;
  const rulHours       = pdm?.rul?.hours;
  const rulCritical    = rulHours != null && rulHours < 72;
  const rulWarning     = rulHours != null && rulHours < 200;

  return (
    <li>
      <Link
        href={`/pdm/${machine.id}`}
        className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition hover:border-blue-300 hover:shadow-md"
      >
        <div>
          <p className="font-semibold text-slate-800">{machine.machineCode}</p>
          <p className="text-xs text-slate-400">{machine.name} · {machine.machineType}</p>
        </div>

        <div className="flex items-center gap-4 text-sm">
          {/* 이상 감지 */}
          <div className="text-center">
            <p className="text-[10px] text-slate-400 mb-0.5">이상 감지</p>
            {pdm == null ? (
              <span className="text-xs text-slate-300">—</span>
            ) : hasAnomaly ? (
              <span className="flex items-center gap-1 text-red-600 font-semibold text-xs">
                <Flame size={11} /> 감지
              </span>
            ) : (
              <span className="text-xs text-emerald-600">정상</span>
            )}
          </div>

          {/* 고장 확률 */}
          <div className="text-center">
            <p className="text-[10px] text-slate-400 mb-0.5">고장 확률</p>
            {pdm == null ? (
              <span className="text-xs text-slate-300">—</span>
            ) : (
              <span className={`text-xs font-semibold ${failureMax >= 0.7 ? 'text-red-600' : failureMax >= 0.4 ? 'text-amber-600' : 'text-slate-600'}`}>
                {(failureMax * 100).toFixed(0)}%
              </span>
            )}
          </div>

          {/* RUL */}
          <div className="text-center min-w-[56px]">
            <p className="text-[10px] text-slate-400 mb-0.5">잔여수명</p>
            {pdm == null || rulHours == null ? (
              <span className="text-xs text-slate-300">—</span>
            ) : (
              <span className={`flex items-center gap-1 text-xs font-semibold ${rulCritical ? 'text-red-600' : rulWarning ? 'text-amber-600' : 'text-slate-600'}`}>
                <Clock size={10} />
                {rulHours.toFixed(0)}h
              </span>
            )}
          </div>

          {/* 트렌드 */}
          <div className="text-center">
            <p className="text-[10px] text-slate-400 mb-0.5">트렌드</p>
            {pdm?.rul ? <TrendBadge trend={pdm.rul.trend} /> : <span className="text-xs text-slate-300">—</span>}
          </div>

          <ChevronRight size={16} className="text-slate-300" />
        </div>
      </Link>
    </li>
  );
}

function ModelStatusBar() {
  const { data } = useModelStatus();
  const models = data?.data ?? [];
  if (!models.length) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {models.map((m) => (
        <span
          key={m.modelType}
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            m.isActive ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-400'
          }`}
        >
          {m.modelType} {m.version && `v${m.version}`}
          {m.trainedAt && ` · ${new Date(m.trainedAt).toLocaleDateString('ko-KR')}`}
        </span>
      ))}
    </div>
  );
}

export default function PdmListPage() {
  const { data: machinesData, isLoading } = useMachines();
  const machines = machinesData?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity size={22} className="text-blue-600" />
          <h1 className="page-title">예측정비 (PdM) 대시보드</h1>
        </div>
      </div>

      <ModelStatusBar />

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : machines.length === 0 ? (
        <p className="py-12 text-center text-sm text-slate-400">등록된 설비가 없습니다.</p>
      ) : (
        <ul className="space-y-2">
          {machines.map((m) => (
            <MachinePdmRow key={m.id} machine={m} />
          ))}
        </ul>
      )}
    </div>
  );
}
