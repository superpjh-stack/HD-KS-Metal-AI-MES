'use client';

import Link from 'next/link';
import { Package, Search, Loader2, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { useLotList } from '@/features/lot/useLotTrace';

const STATUS_COLOR: Record<string, string> = {
  ACTIVE:   'bg-emerald-100 text-emerald-700',
  USED:     'bg-slate-100 text-slate-600',
  REJECTED: 'bg-red-100 text-red-700',
  SHIPPED:  'bg-blue-100 text-blue-700',
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: '활성', USED: '사용완료', REJECTED: '불량', SHIPPED: '출하',
};

export default function LotListPage() {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useLotList(search ? { lotNumber: search } : undefined);
  const lots = data?.data ?? [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="page-title flex items-center gap-2">
          <Package size={20} className="text-blue-600" />
          입고 / LOT 관리
        </h1>
      </div>

      {/* 검색 */}
      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="LOT 번호 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* 테이블 */}
      <div className="section-card overflow-hidden p-0">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="animate-spin text-blue-600" size={24} />
          </div>
        ) : lots.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-slate-400">
            LOT 데이터가 없습니다.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50">
              <tr>
                {['LOT 번호', '유형', '자재', '공급업체', '수량', '상태', '등록일', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lots.map((lot) => (
                <tr key={lot.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono font-medium text-slate-900">{lot.lotNumber}</td>
                  <td className="px-4 py-3 text-slate-600">{lot.lotType}</td>
                  <td className="px-4 py-3 text-slate-600">{lot.material?.name ?? '-'}</td>
                  <td className="px-4 py-3 text-slate-600">{lot.supplier?.name ?? '-'}</td>
                  <td className="px-4 py-3 text-slate-600">{lot.quantity} {lot.unit}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[lot.status] ?? ''}`}>
                      {STATUS_LABEL[lot.status] ?? lot.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {new Date(lot.createdAt).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/lot/${lot.id}`}
                      className="flex items-center gap-0.5 text-blue-600 hover:underline"
                    >
                      추적 <ChevronRight size={13} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
