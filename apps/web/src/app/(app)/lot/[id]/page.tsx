'use client';

import { use } from 'react';
import { ArrowLeft, Package, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useLotTrace } from '@/features/lot/useLotTrace';
import { LotTraceTimeline } from '@/features/lot/LotTraceTimeline';

const STATUS_LABEL: Record<string, string> = {
  ACTIVE:   '활성',
  USED:     '사용완료',
  REJECTED: '불량',
  SHIPPED:  '출하',
};

const STATUS_COLOR: Record<string, string> = {
  ACTIVE:   'bg-emerald-100 text-emerald-700',
  USED:     'bg-slate-100 text-slate-600',
  REJECTED: 'bg-red-100 text-red-700',
  SHIPPED:  'bg-blue-100 text-blue-700',
};

export default function LotTracePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading, isError } = useLotTrace(id);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 text-slate-500">
        <AlertCircle size={32} className="text-red-400" />
        <p className="text-sm">LOT 정보를 불러올 수 없습니다.</p>
        <Link href="/lot" className="text-xs text-blue-500 underline">
          목록으로 돌아가기
        </Link>
      </div>
    );
  }

  const { lot, events } = data.data;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <Link href="/lot" className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex items-center gap-2">
          <Package size={20} className="text-blue-600" />
          <h1 className="page-title">LOT 추적: {lot.lotNumber}</h1>
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOR[lot.status] ?? 'bg-slate-100'}`}>
          {STATUS_LABEL[lot.status] ?? lot.status}
        </span>
      </div>

      {/* LOT 기본 정보 */}
      <div className="section-card">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">LOT 기본 정보</h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm md:grid-cols-3">
          <div>
            <dt className="text-slate-500">LOT 번호</dt>
            <dd className="font-medium text-slate-900">{lot.lotNumber}</dd>
          </div>
          <div>
            <dt className="text-slate-500">유형</dt>
            <dd className="font-medium text-slate-900">{lot.lotType}</dd>
          </div>
          <div>
            <dt className="text-slate-500">수량</dt>
            <dd className="font-medium text-slate-900">{lot.quantity} {lot.unit}</dd>
          </div>
          {lot.material && (
            <div>
              <dt className="text-slate-500">자재</dt>
              <dd className="font-medium text-slate-900">{lot.material.name}</dd>
            </div>
          )}
          {lot.supplier && (
            <div>
              <dt className="text-slate-500">공급업체</dt>
              <dd className="font-medium text-slate-900">{lot.supplier.name}</dd>
            </div>
          )}
          <div>
            <dt className="text-slate-500">등록일</dt>
            <dd className="font-medium text-slate-900">
              {new Date(lot.createdAt).toLocaleDateString('ko-KR')}
            </dd>
          </div>
        </dl>
      </div>

      {/* 이력 타임라인 */}
      <div className="section-card">
        <h2 className="mb-5 text-sm font-semibold text-slate-700">
          이력 타임라인 <span className="ml-1 text-slate-400">({events.length}건)</span>
        </h2>
        <LotTraceTimeline events={events} />
      </div>
    </div>
  );
}
