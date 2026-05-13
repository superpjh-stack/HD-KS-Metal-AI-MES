'use client';

import {
  ComposedChart, Line, ReferenceLine,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import type { SpcControlLimits, SpcPoint } from './types';

interface SpcXbarChartProps {
  points: SpcPoint[];
  limits: SpcControlLimits | null;
  height?: number;
}

export function SpcXbarChart({ points, limits, height = 240 }: SpcXbarChartProps) {
  const data = points.map((p) => ({
    label: new Date(p.bucket).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
    xbar:  p.xbar,
    violation: p.violations.length > 0 ? p.xbar : null,
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 6 }}
          formatter={(v: number) => v.toFixed(3)}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />

        {limits && (
          <>
            <ReferenceLine y={limits.ucl_xbar} stroke="#ef4444" strokeDasharray="4 2" label={{ value: 'UCL', fontSize: 10, fill: '#ef4444' }} />
            <ReferenceLine y={limits.cl_xbar}  stroke="#64748b" strokeDasharray="2 2" label={{ value: 'CL',  fontSize: 10, fill: '#64748b' }} />
            <ReferenceLine y={limits.lcl_xbar} stroke="#ef4444" strokeDasharray="4 2" label={{ value: 'LCL', fontSize: 10, fill: '#ef4444' }} />
          </>
        )}

        <Line
          dataKey="xbar"
          name="X̄"
          dot={{ r: 3, fill: '#3b82f6' }}
          stroke="#3b82f6"
          strokeWidth={1.5}
          isAnimationActive={false}
        />
        <Line
          dataKey="violation"
          name="위반"
          dot={{ r: 5, fill: '#ef4444' }}
          stroke="none"
          isAnimationActive={false}
          legendType="circle"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

interface SpcRangeChartProps {
  points: SpcPoint[];
  limits: SpcControlLimits | null;
  height?: number;
}

export function SpcRangeChart({ points, limits, height = 160 }: SpcRangeChartProps) {
  const data = points.map((p) => ({
    label: new Date(p.bucket).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
    range: p.range,
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} formatter={(v: number) => v.toFixed(3)} />
        <Legend wrapperStyle={{ fontSize: 12 }} />

        {limits && (
          <>
            <ReferenceLine y={limits.ucl_r} stroke="#f97316" strokeDasharray="4 2" label={{ value: 'UCL_R', fontSize: 10, fill: '#f97316' }} />
            <ReferenceLine y={limits.cl_r}  stroke="#64748b" strokeDasharray="2 2" label={{ value: 'CL_R',  fontSize: 10, fill: '#64748b' }} />
          </>
        )}

        <Line
          dataKey="range"
          name="범위 R"
          dot={{ r: 3, fill: '#10b981' }}
          stroke="#10b981"
          strokeWidth={1.5}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
