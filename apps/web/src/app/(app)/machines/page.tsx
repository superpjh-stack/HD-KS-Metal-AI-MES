'use client';

import Link from 'next/link';
import { Factory, RefreshCw, TrendingUp, Activity, CheckCircle, AlertTriangle, Wrench, XCircle, AlertCircle } from 'lucide-react';
import { useMachineList } from '@/features/machines/useMachines';
import { useState } from 'react';
import type { MachineSummary } from '@/lib/api-client';

const STATUS_LIST = [
  { value: '',            label: '전체' },
  { value: 'ACTIVE',      label: '정상' },
  { value: 'WARNING',     label: '경고' },
  { value: 'MAINTENANCE', label: '정비중' },
  { value: 'INACTIVE',    label: '비가동' },
] as const;

const STATUS_STYLE: Record<string, { badge: string; border: string; icon: React.ReactNode }> = {
  ACTIVE:      { badge: 'bg-emerald-100 text-emerald-700', border: 'border-emerald-200', icon: <CheckCircle size={14} className="text-emerald-500" /> },
  WARNING:     { badge: 'bg-amber-100 text-amber-700',     border: 'border-amber-300',   icon: <AlertTriangle size={14} className="text-amber-500" /> },
  MAINTENANCE: { badge: 'bg-blue-100 text-blue-700',       border: 'border-blue-200',    icon: <Wrench size={14} className="text-blue-500" /> },
  INACTIVE:    { badge: 'bg-slate-100 text-slate-500',     border: 'border-slate-200',   icon: <XCircle size={14} className="text-slate-400" /> },
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE:      '정상',
  WARNING:     '경고',
  MAINTENANCE: '정비중',
  INACTIVE:    '비가동',
};

const TYPE_LABEL: Record<string, string> = {
  PRESS:      '프레스',
  WELDING:    '용접',
  BENDING:    '절곡',
  INSPECTION: '검사',
  LATHE:      '선반',
  MILLING:    '밀링',
};

function MachineCard({ machine }: { machine: MachineSummary }) {
  const style = STATUS_STYLE[machine.status] ?? STATUS_STYLE.INACTIVE;

  return (
    <div className={`rounded-xl border-2 bg-white p-4 space-y-3 transition-shadow hover:shadow-md ${style.border}`}>
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="font-bold text-slate-800 truncate">{machine.machineCode}</p>
          <p className="text-xs text-slate-500 truncate mt-0.5">{machine.name}</p>
        </div>
        <span title={STATUS_LABEL[machine.status] ?? machine.status}>{style.icon}</span>
      </div>

      <div className="space-y-1 text-xs text-slate-500">
        <div className="flex justify-between">
          <span>유형</span>
          <span className="font-medium text-slate-700">{TYPE_LABEL[machine.machineType] ?? machine.machineType}</span>
        </div>
        {machine.line && (
          <div className="flex justify-between">
            <span>라인</span>
            <span className="font-medium text-slate-700">{machine.line.name}</span>
          </div>
        )}
        {machine.manufacturer && (
          <div className="flex justify-between">
            <span>제조사</span>
            <span className="font-medium text-slate-700">{machine.manufacturer}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-1">
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${style.badge}`}>
          {STATUS_LABEL[machine.status] ?? machine.status}
        </span>
        <div className="flex gap-1">
          <Link
            href={`/spc/${machine.id}`}
            className="flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600 hover:bg-blue-50 hover:text-blue-700 transition-colors"
          >
            <TrendingUp size={11} />
            SPC
          </Link>
          <Link
            href={`/pdm/${machine.id}`}
            className="flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600 hover:bg-blue-50 hover:text-blue-700 transition-colors"
          >
            <Activity size={11} />
            PDM
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function MachinesPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const { data, isLoading, isError, refetch, isFetching } = useMachineList();
  const allMachines = data?.data ?? [];

  const filtered = statusFilter
    ? allMachines.filter((m) => m.status === statusFilter)
    : allMachines;

  const counts = {
    '':            allMachines.length,
    ACTIVE:        allMachines.filter((m) => m.status === 'ACTIVE').length,
    WARNING:       allMachines.filter((m) => m.status === 'WARNING').length,
    MAINTENANCE:   allMachines.filter((m) => m.status === 'MAINTENANCE').length,
    INACTIVE:      allMachines.filter((m) => m.status === 'INACTIVE').length,
  } as Record<string, number>;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Factory size={20} className="text-blue-600" />
        <h1 className="page-title">설비 현황</h1>
        <button
          onClick={() => void refetch()}
          className="ml-auto rounded-md p-1.5 hover:bg-slate-100"
          title="새로고침"
        >
          <RefreshCw
            size={14}
            className={isFetching ? 'animate-spin text-blue-500' : 'text-slate-400'}
          />
        </button>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { value: '',            label: '전체',   color: 'border-slate-200 bg-white' },
          { value: 'ACTIVE',      label: '정상',   color: 'border-emerald-200 bg-emerald-50' },
          { value: 'WARNING',     label: '경고',   color: 'border-amber-200 bg-amber-50' },
          { value: 'MAINTENANCE', label: '정비중', color: 'border-blue-200 bg-blue-50' },
          { value: 'INACTIVE',    label: '비가동', color: 'border-slate-200 bg-slate-50' },
        ].map(({ value, label, color }) => (
          <button
            key={value}
            onClick={() => setStatusFilter(value)}
            className={[
              'rounded-xl border p-3 text-center transition-all hover:shadow-sm',
              color,
              statusFilter === value ? 'ring-2 ring-blue-400 ring-offset-1' : '',
            ].join(' ')}
          >
            <p className="text-2xl font-bold text-slate-800">{counts[value] ?? 0}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </button>
        ))}
      </div>

      {/* 상태 필터 탭 */}
      <div className="flex flex-wrap gap-2">
        {STATUS_LIST.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setStatusFilter(value)}
            className={[
              'rounded-full border px-3.5 py-1 text-sm font-medium transition-colors',
              statusFilter === value
                ? 'border-blue-500 bg-blue-500 text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 설비 카드 그리드 */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-44 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : isError ? (
        <div className="flex h-40 flex-col items-center justify-center gap-2 text-slate-500">
          <AlertCircle size={28} className="text-red-400" />
          <p className="text-sm">데이터를 불러오지 못했습니다.</p>
          <button
            onClick={() => void refetch()}
            className="text-xs text-blue-500 underline hover:text-blue-700"
          >
            다시 시도
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-slate-200 text-sm text-slate-400">
          해당 상태의 설비가 없습니다.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((machine) => (
            <MachineCard key={machine.id} machine={machine} />
          ))}
        </div>
      )}

      <p className="text-right text-xs text-slate-400">
        {filtered.length}대 표시 / 전체 {allMachines.length}대
      </p>
    </div>
  );
}
