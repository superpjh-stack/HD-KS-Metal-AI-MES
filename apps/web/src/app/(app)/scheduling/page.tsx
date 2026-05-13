'use client';

import { useState, useMemo } from 'react';
import { useGantt, useUpdateScheduleStatus, type GanttRow, type ProductionSchedule, type ScheduleStatus } from '@/features/scheduling/useSchedules';

const STATUS_COLOR: Record<ScheduleStatus, string> = {
  PENDING:     'fill-blue-400',
  IN_PROGRESS: 'fill-amber-400',
  COMPLETED:   'fill-emerald-500',
  CANCELLED:   'fill-slate-300',
  ON_HOLD:     'fill-orange-400',
};

const STATUS_LABEL: Record<ScheduleStatus, string> = {
  PENDING:     '대기',
  IN_PROGRESS: '진행중',
  COMPLETED:   '완료',
  CANCELLED:   '취소',
  ON_HOLD:     '보류',
};

const STATUS_BG: Record<ScheduleStatus, string> = {
  PENDING:     'bg-blue-50 text-blue-700 border-blue-200',
  IN_PROGRESS: 'bg-amber-50 text-amber-700 border-amber-200',
  COMPLETED:   'bg-emerald-50 text-emerald-700 border-emerald-200',
  CANCELLED:   'bg-slate-50 text-slate-500 border-slate-200',
  ON_HOLD:     'bg-orange-50 text-orange-700 border-orange-200',
};

const RANGE_OPTIONS = [
  { label: '7일', days: 7 },
  { label: '14일', days: 14 },
  { label: '30일', days: 30 },
];

function isoOffset(base: Date, offsetDays: number) {
  return new Date(base.getTime() + offsetDays * 86_400_000).toISOString().slice(0, 10);
}

const MACHINE_COL = 120;
const ROW_H = 44;
const CHART_H = 20;
const PAD_Y = 12;

interface GanttBarProps {
  s: ProductionSchedule;
  rangeStart: number;
  rangeEnd: number;
  chartW: number;
  onSelect: (s: ProductionSchedule) => void;
}

function GanttBar({ s, rangeStart, rangeEnd, chartW, onSelect }: GanttBarProps) {
  const start  = Math.max(new Date(s.plannedStart).getTime(), rangeStart);
  const end    = Math.min(new Date(s.plannedEnd).getTime(),   rangeEnd);
  const total  = rangeEnd - rangeStart;
  const x      = ((start - rangeStart) / total) * chartW;
  const w      = Math.max(((end - start) / total) * chartW, 4);

  const colorClass = STATUS_COLOR[s.status];

  return (
    <rect
      x={x}
      y={PAD_Y}
      width={w}
      height={CHART_H}
      rx={3}
      className={`${colorClass} cursor-pointer opacity-90 hover:opacity-100`}
      onClick={() => onSelect(s)}
    >
      <title>{s.scheduleNo} — {s.productCode} ({STATUS_LABEL[s.status]})</title>
    </rect>
  );
}

function GanttRow({ row, rangeStart, rangeEnd, chartW, onSelect }: {
  row: GanttRow;
  rangeStart: number;
  rangeEnd: number;
  chartW: number;
  onSelect: (s: ProductionSchedule) => void;
}) {
  return (
    <div className="flex items-center border-b border-slate-100" style={{ height: ROW_H }}>
      <div
        className="flex-shrink-0 text-xs font-mono text-slate-500 px-2 truncate"
        style={{ width: MACHINE_COL }}
        title={row.machineId}
      >
        {row.machineId.slice(-8)}
      </div>
      <div className="flex-1 relative">
        <svg width="100%" height={ROW_H} className="overflow-visible">
          {row.schedules.map((s) => (
            <GanttBar
              key={s.id}
              s={s}
              rangeStart={rangeStart}
              rangeEnd={rangeEnd}
              chartW={chartW}
              onSelect={onSelect}
            />
          ))}
        </svg>
      </div>
    </div>
  );
}

function DayHeaders({ from, to, chartW }: { from: Date; to: Date; chartW: number }) {
  const days: Date[] = [];
  const cur = new Date(from);
  while (cur <= to) {
    days.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  const total = to.getTime() - from.getTime();

  return (
    <div className="flex border-b border-slate-200 text-xs text-slate-400">
      <div className="flex-shrink-0" style={{ width: MACHINE_COL }} />
      <div className="flex-1 relative h-7">
        {days.map((d) => {
          const left = ((d.getTime() - from.getTime()) / total) * 100;
          return (
            <span
              key={d.toISOString()}
              className="absolute top-1 transform -translate-x-1/2"
              style={{ left: `${left}%` }}
            >
              {d.getMonth() + 1}/{d.getDate()}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function DetailPanel({ schedule, onClose }: { schedule: ProductionSchedule; onClose: () => void }) {
  const mutation = useUpdateScheduleStatus();

  const nextStatus: Record<ScheduleStatus, ScheduleStatus | null> = {
    PENDING:     'IN_PROGRESS',
    IN_PROGRESS: 'COMPLETED',
    COMPLETED:   null,
    CANCELLED:   null,
    ON_HOLD:     'IN_PROGRESS',
  };

  const next = nextStatus[schedule.status];

  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-white shadow-2xl border-l border-slate-200 p-5 z-50 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-800">{schedule.scheduleNo}</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
      </div>

      <div className="space-y-3 text-sm">
        <div>
          <p className="text-xs text-slate-400">품번</p>
          <p className="font-mono font-medium">{schedule.productCode}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">설비 ID</p>
          <p className="font-mono text-slate-600">{schedule.machineId}</p>
        </div>
        <div className="flex gap-3">
          <div>
            <p className="text-xs text-slate-400">계획 수량</p>
            <p className="font-medium">{schedule.plannedQty.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">우선순위</p>
            <p className="font-medium">{schedule.priority}</p>
          </div>
        </div>
        <div>
          <p className="text-xs text-slate-400">계획 시작</p>
          <p>{new Date(schedule.plannedStart).toLocaleString('ko-KR')}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">계획 종료</p>
          <p>{new Date(schedule.plannedEnd).toLocaleString('ko-KR')}</p>
        </div>
        {schedule.actualStart && (
          <div>
            <p className="text-xs text-slate-400">실제 시작</p>
            <p>{new Date(schedule.actualStart).toLocaleString('ko-KR')}</p>
          </div>
        )}
        <div>
          <p className="text-xs text-slate-400 mb-1">상태</p>
          <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_BG[schedule.status]}`}>
            {STATUS_LABEL[schedule.status]}
          </span>
        </div>
        {schedule.notes && (
          <div>
            <p className="text-xs text-slate-400">메모</p>
            <p className="text-slate-600">{schedule.notes}</p>
          </div>
        )}
      </div>

      {next && (
        <button
          onClick={() => mutation.mutate({ id: schedule.id, status: next })}
          disabled={mutation.isPending}
          className="mt-6 w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {mutation.isPending ? '처리중…' : `→ ${STATUS_LABEL[next]}으로 변경`}
        </button>
      )}
    </div>
  );
}

export default function SchedulingPage() {
  const [days, setDays] = useState(14);
  const [selected, setSelected] = useState<ProductionSchedule | null>(null);

  const today = useMemo(() => new Date(), []);
  const from = isoOffset(today, -Math.floor(days / 2));
  const to   = isoOffset(today, Math.ceil(days / 2));

  const rangeStart = new Date(from).getTime();
  const rangeEnd   = new Date(to + 'T23:59:59').getTime();

  const { data, isLoading } = useGantt(from, to);
  const rows = data?.data ?? [];

  const CHART_W = 800;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">생산 스케줄</h1>
        <div className="flex gap-2">
          {RANGE_OPTIONS.map((r) => (
            <button
              key={r.days}
              onClick={() => setDays(r.days)}
              className={`rounded-lg px-3 py-1.5 text-sm transition ${
                days === r.days ? 'bg-blue-600 text-white' : 'border border-slate-200 text-slate-600 hover:border-blue-300'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs text-slate-500">
        {(Object.keys(STATUS_LABEL) as ScheduleStatus[]).map((s) => (
          <span key={s} className="flex items-center gap-1">
            <span className={`inline-block w-3 h-3 rounded-sm ${STATUS_COLOR[s].replace('fill-', 'bg-')}`} />
            {STATUS_LABEL[s]}
          </span>
        ))}
      </div>

      {/* Gantt Chart */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
        <DayHeaders from={new Date(from)} to={new Date(to)} chartW={CHART_W} />

        {isLoading && (
          <div className="space-y-2 p-4">
            {[1, 2, 3].map(i => <div key={i} className="h-10 animate-pulse bg-slate-100 rounded" />)}
          </div>
        )}

        {!isLoading && rows.length === 0 && (
          <div className="py-16 text-center text-sm text-slate-400">
            해당 기간에 스케줄이 없습니다
          </div>
        )}

        {rows.map((row) => (
          <GanttRow
            key={row.machineId}
            row={row}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            chartW={CHART_W}
            onSelect={setSelected}
          />
        ))}
      </div>

      {/* Detail Panel */}
      {selected && (
        <DetailPanel
          schedule={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
