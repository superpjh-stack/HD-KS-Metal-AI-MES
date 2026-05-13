'use client';

import { KpiCard, MachineStatusBadge, SensorSparkline, AlertPanel } from '@ks-mes/ui';
import {
  useMachines,
  useSensorLatest,
  useActiveLots,
  useMachineKpi,
  useActiveWorkOrders,
} from '@/features/dashboard/useDashboard';
import { useAlerts } from '@/features/dashboard/useAlerts';
import { useOeeHistory, useEnergy } from '@/features/stats/useStats';
import { RefreshCw, Wifi, WifiOff } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, CartesianGrid,
} from 'recharts';

/** Skeleton block shown while a KPI value is loading. */
function KpiSkeleton() {
  return <div className="h-24 animate-pulse rounded-xl bg-slate-100" />;
}

const OEE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899'];

export default function DashboardPage() {
  const { data: machines, isLoading: machinesLoading } = useMachines();
  const { data: sensors, isLoading: sensorsLoading, refetch } = useSensorLatest();
  const { data: lotsData,      isLoading: lotsLoading }      = useActiveLots();
  const { data: machineKpi,    isLoading: machineKpiLoading } = useMachineKpi();
  const { data: workOrderData, isLoading: woLoading }         = useActiveWorkOrders();
  const { alerts, connected: alertConnected, dismiss } = useAlerts();

  const allMachines = machineKpi?.data ?? [];
  const firstMachineId = allMachines[0]?.id ?? '';
  const { data: oeeHistoryData } = useOeeHistory(firstMachineId, 7);
  const { data: energyData }     = useEnergy(firstMachineId, 24);

  const machineList = machines?.data ?? [];
  const sensorMachines = sensors?.data?.machines ?? [];

  // KPI derivations from live data
  const activeMachineCount = allMachines.filter((m) => m.status === 'ACTIVE').length;
  const totalMachineCount  = allMachines.length;
  const utilizationPct =
    totalMachineCount > 0
      ? ((activeMachineCount / totalMachineCount) * 100).toFixed(1)
      : '—';

  const activeLotsCount    = lotsData?.total ?? 0;
  const activeWoCount      = workOrderData?.total ?? 0;

  const kpiLoading = lotsLoading || machineKpiLoading || woLoading;

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h1 className="page-title">AI 대시보드</h1>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span>자동 갱신 30s</span>
          <button
            onClick={() => void refetch()}
            className="rounded-md p-1.5 hover:bg-slate-100"
            title="새로고침"
          >
            <RefreshCw size={15} className={sensorsLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* KPI 카드 4종 */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpiLoading ? (
          <>
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
          </>
        ) : (
          <>
            {/* 설비 가동률 — derived from GET /api/v1/machines */}
            <KpiCard
              title="설비 가동률"
              value={utilizationPct}
              unit="%"
              trend={activeMachineCount > 0 ? 'up' : 'neutral'}
              trendValue={`가동 ${activeMachineCount}대 / 전체 ${totalMachineCount}대`}
              status={
                totalMachineCount > 0 && activeMachineCount / totalMachineCount >= 0.7
                  ? 'normal'
                  : 'warning'
              }
            />

            {/* 활성 LOT — derived from GET /api/v1/lots?status=ACTIVE */}
            <KpiCard
              title="활성 LOT"
              value={String(activeLotsCount)}
              unit="건"
              trend="neutral"
              trendValue="현재 진행 중인 LOT"
              status="normal"
            />

            {/* 진행 중 작업지시 — derived from GET /api/v1/work-orders?status=IN_PROGRESS */}
            <KpiCard
              title="작업지시 진행"
              value={String(activeWoCount)}
              unit="건"
              trend={activeWoCount > 0 ? 'up' : 'neutral'}
              trendValue="IN_PROGRESS 작업지시"
              status="normal"
            />

            {/* 설비 경고/유지보수 대수 */}
            <KpiCard
              title="점검 필요 설비"
              value={String(
                allMachines.filter(
                  (m) => m.status === 'WARNING' || m.status === 'MAINTENANCE',
                ).length,
              )}
              unit="대"
              trend={
                allMachines.some((m) => m.status === 'WARNING') ? 'down' : 'neutral'
              }
              trendValue="WARNING / MAINTENANCE"
              status={
                allMachines.some((m) => m.status === 'WARNING') ? 'warning' : 'normal'
              }
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* 설비 상태 현황 */}
        <div className="section-card lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">설비 상태 현황</h2>
          {machinesLoading ? (
            <div className="flex gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 w-28 animate-pulse rounded-lg bg-slate-100" />
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              {machineList.length > 0 ? (
                machineList.map((m) => (
                  <MachineStatusBadge
                    key={m.id}
                    machineCode={m.machineCode}
                    status={m.status as 'ACTIVE' | 'MAINTENANCE' | 'RETIRED' | 'WARNING'}
                    spm={
                      sensorMachines
                        .find((s) => s.machineCode === m.machineCode)
                        ?.sensors?.spm?.value
                    }
                  />
                ))
              ) : (
                /* 개발 중 목업 */
                ['PRESS-01', 'PRESS-02', 'PRESS-03', 'PRESS-04'].map((code, i) => (
                  <MachineStatusBadge
                    key={code}
                    machineCode={code}
                    status={i === 2 ? 'WARNING' : i === 3 ? 'MAINTENANCE' : 'ACTIVE'}
                    spm={i < 3 ? [60, 58, 55][i] : undefined}
                  />
                ))
              )}
            </div>
          )}
        </div>

        {/* 알림 패널 */}
        <div className="section-card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">
              실시간 알림 {alerts.length > 0 && (
                <span className="ml-1 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] text-white">
                  {alerts.length}
                </span>
              )}
            </h2>
            <span title={alertConnected ? '알림 서버 연결됨' : '알림 서버 연결 끊김'}>
              {alertConnected
                ? <Wifi size={13} className="text-emerald-500" />
                : <WifiOff size={13} className="text-slate-400" />}
            </span>
          </div>
          <AlertPanel alerts={alerts} onDismiss={dismiss} />
        </div>
      </div>

      {/* OEE 히스토리 + 에너지 차트 */}
      {firstMachineId && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="section-card">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">
              OEE 추이 (7일) — {allMachines[0]?.machineCode ?? ''}
            </h2>
            {!oeeHistoryData ? (
              <div className="h-36 animate-pulse rounded-lg bg-slate-100" />
            ) : (
              <ResponsiveContainer width="100%" height={140}>
                <BarChart
                  data={(oeeHistoryData.data ?? []).map((d) => ({
                    date: d.date.slice(5),
                    oee: parseFloat((d.oee * 100).toFixed(1)),
                  }))}
                  margin={{ left: 0, right: 8, top: 4, bottom: 4 }}
                >
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
                  <Tooltip formatter={(v: number) => [`${v}%`, 'OEE']} contentStyle={{ fontSize: 12 }} />
                  <Bar dataKey="oee" radius={[3, 3, 0, 0]}>
                    {(oeeHistoryData.data ?? []).map((_, i) => (
                      <Cell key={i} fill={OEE_COLORS[i % OEE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="section-card">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">
              전력 소비 (24h) — {allMachines[0]?.machineCode ?? ''}
            </h2>
            {!energyData ? (
              <div className="h-36 animate-pulse rounded-lg bg-slate-100" />
            ) : (
              <ResponsiveContainer width="100%" height={140}>
                <LineChart
                  data={(energyData.data ?? []).map((d) => ({
                    time: new Date(d.time).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
                    kw: parseFloat(d.avgKw.toFixed(2)),
                  }))}
                  margin={{ left: 0, right: 8, top: 4, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="time" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10 }} unit="kW" />
                  <Tooltip formatter={(v: number) => [`${v} kW`, '전력']} contentStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="kw" stroke="#10b981" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {/* 실시간 센서 스파크라인 */}
      <div className="section-card">
        <h2 className="mb-4 text-sm font-semibold text-slate-700">PRESS-01 실시간 센서</h2>
        <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
          {[
            { channel: 'vibration_x', label: '진동 X', unit: 'm/s²', color: '#3b82f6' },
            { channel: 'temperature',  label: '온도',   unit: '°C',   color: '#f59e0b' },
            { channel: 'power_kw',     label: '전력',   unit: 'kW',   color: '#10b981' },
            { channel: 'spm',          label: 'SPM',   unit: 'spm',  color: '#8b5cf6' },
          ].map(({ channel, label, unit, color }) => (
            <div key={channel}>
              <p className="mb-1 text-xs font-medium text-slate-500">{label}</p>
              <SensorSparkline
                machineId="PRESS-01"
                channel={channel}
                unit={unit}
                color={color}
                height={64}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
