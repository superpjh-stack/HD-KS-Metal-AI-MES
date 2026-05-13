'use client';

import type { CapabilityItem } from './types';
import { cn } from './lib/utils';

const STATUS_CLASS: Record<string, string> = {
  OK:               'text-emerald-600 bg-emerald-50',
  WARNING:          'text-amber-600  bg-amber-50',
  CRITICAL:         'text-red-600    bg-red-50',
  NO_SPEC:          'text-slate-500  bg-slate-100',
  INSUFFICIENT_DATA:'text-slate-400  bg-slate-50',
};

const STATUS_LABEL: Record<string, string> = {
  OK:               '양호 (≥1.33)',
  WARNING:          '주의 (1.0~1.33)',
  CRITICAL:         '불량 (<1.0)',
  NO_SPEC:          '규격 미입력',
  INSUFFICIENT_DATA:'데이터 부족',
};

interface CapabilityTableProps {
  items: CapabilityItem[];
}

export function CapabilityTable({ items }: CapabilityTableProps) {
  if (items.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-slate-400">공정능력 데이터가 없습니다.</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
            <th className="py-2 pr-4 font-medium">채널</th>
            <th className="py-2 pr-4 font-medium">Cp</th>
            <th className="py-2 pr-4 font-medium">Cpk</th>
            <th className="py-2 pr-4 font-medium">평균</th>
            <th className="py-2 pr-4 font-medium">표준편차</th>
            <th className="py-2 pr-4 font-medium">USL / LSL</th>
            <th className="py-2 font-medium">판정</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.channel} className="border-b border-slate-100 hover:bg-slate-50">
              <td className="py-2.5 pr-4 font-mono text-xs">{item.channel}</td>
              <td className="py-2.5 pr-4">{item.cp != null ? item.cp.toFixed(2) : '—'}</td>
              <td className="py-2.5 pr-4">{item.cpk != null ? item.cpk.toFixed(2) : '—'}</td>
              <td className="py-2.5 pr-4">{item.mean.toFixed(3)}</td>
              <td className="py-2.5 pr-4">{item.std.toFixed(4)}</td>
              <td className="py-2.5 pr-4 text-xs text-slate-500">
                {item.usl != null ? item.usl.toFixed(2) : '—'} / {item.lsl != null ? item.lsl.toFixed(2) : '—'}
              </td>
              <td className="py-2.5">
                <span className={cn('rounded px-2 py-0.5 text-xs font-medium', STATUS_CLASS[item.status])}>
                  {STATUS_LABEL[item.status]}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
