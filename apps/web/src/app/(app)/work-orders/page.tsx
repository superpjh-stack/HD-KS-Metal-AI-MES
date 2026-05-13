'use client';

import { ClipboardList, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { useWorkOrders } from '@/features/work-orders/useWorkOrders';

const STATUS_LIST = [
  { value: '',            label: '전체' },
  { value: 'PLANNED',     label: '계획' },
  { value: 'IN_PROGRESS', label: '진행중' },
  { value: 'COMPLETED',   label: '완료' },
  { value: 'ON_HOLD',     label: '보류' },
] as const;

const STATUS_COLOR: Record<string, string> = {
  PLANNED:     'bg-slate-100 text-slate-600',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  COMPLETED:   'bg-emerald-100 text-emerald-700',
  ON_HOLD:     'bg-amber-100 text-amber-700',
};

const STATUS_LABEL: Record<string, string> = {
  PLANNED:     '계획',
  IN_PROGRESS: '진행중',
  COMPLETED:   '완료',
  ON_HOLD:     '보류',
};

function ProgressBar({ produced, planned }: { produced: number; planned: number }) {
  const pct = planned > 0 ? Math.min(100, Math.round((produced / planned) * 100)) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 rounded-full bg-slate-100">
        <div
          className="h-1.5 rounded-full bg-blue-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-slate-500">{pct}%</span>
    </div>
  );
}

export default function WorkOrdersPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const { data, isLoading, isError, refetch, isFetching } = useWorkOrders();

  const allOrders = data?.data ?? [];
  const filtered = statusFilter
    ? allOrders.filter((w) => w.status === statusFilter)
    : allOrders;

  const counts: Record<string, number> = {
    '':            allOrders.length,
    PLANNED:     allOrders.filter((w) => w.status === 'PLANNED').length,
    IN_PROGRESS: allOrders.filter((w) => w.status === 'IN_PROGRESS').length,
    COMPLETED:   allOrders.filter((w) => w.status === 'COMPLETED').length,
    ON_HOLD:     allOrders.filter((w) => w.status === 'ON_HOLD').length,
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <ClipboardList size={20} className="text-blue-600" />
        <h1 className="page-title">작업 지시</h1>
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

      {/* 상태 필터 */}
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
            <span className="ml-1.5 text-xs opacity-70">{counts[value] ?? 0}</span>
          </button>
        ))}
      </div>

      {/* 테이블 */}
      <div className="section-card overflow-hidden p-0">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="animate-spin text-blue-600" size={24} />
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
          <div className="flex h-40 items-center justify-center text-sm text-slate-400">
            작업 지시가 없습니다.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50">
              <tr>
                {['작업 지시 번호', '제품 코드', '설비', '담당자', '계획 / 생산 수량', '불량', '진행률', '상태', '계획 기간'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((wo) => (
                <tr key={wo.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono font-medium text-slate-900">{wo.woNumber}</td>
                  <td className="px-4 py-3 text-slate-700">{wo.productCode}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {wo.machine ? (
                      <span>
                        {wo.machine.machineCode}
                        <span className="ml-1 text-xs text-slate-400">{wo.machine.name}</span>
                      </span>
                    ) : '-'}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {wo.operator?.name ?? <span className="text-slate-300">미배정</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    <span className="font-medium">{wo.producedQty.toLocaleString()}</span>
                    <span className="text-slate-400"> / {wo.plannedQty.toLocaleString()}</span>
                  </td>
                  <td className="px-4 py-3">
                    {wo.defectQty > 0 ? (
                      <span className="font-medium text-red-600">{wo.defectQty.toLocaleString()}</span>
                    ) : (
                      <span className="text-slate-400">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <ProgressBar produced={wo.producedQty} planned={wo.plannedQty} />
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[wo.status] ?? 'bg-slate-100 text-slate-600'}`}>
                      {STATUS_LABEL[wo.status] ?? wo.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {wo.plannedStart ? new Date(wo.plannedStart).toLocaleDateString('ko-KR') : '-'}
                    {wo.plannedEnd ? ` ~ ${new Date(wo.plannedEnd).toLocaleDateString('ko-KR')}` : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!isLoading && !isError && (
        <p className="text-right text-xs text-slate-400">
          {filtered.length}건 표시 / 전체 {allOrders.length}건
        </p>
      )}
    </div>
  );
}
