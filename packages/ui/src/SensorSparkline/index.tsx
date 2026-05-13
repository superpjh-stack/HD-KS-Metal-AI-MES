'use client';

import { useEffect, useRef, useState } from 'react';
import { LineChart, Line, ResponsiveContainer, Tooltip, YAxis } from 'recharts';

interface Point {
  time: number;
  value: number;
}

interface SensorSparklineProps {
  machineId: string;
  channel: string;
  unit?: string;
  color?: string;
  height?: number;
  maxPoints?: number;
  /** SSE endpoint base URL. Defaults to /api/v1/sensors */
  baseUrl?: string;
}

export function SensorSparkline({
  machineId,
  channel,
  unit = '',
  color = '#3b82f6',
  height = 60,
  maxPoints = 30,
  baseUrl = '/api/v1/sensors',
}: SensorSparklineProps) {
  const [data, setData] = useState<Point[]>([]);
  const [latest, setLatest] = useState<number | null>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource(`${baseUrl}/${machineId}/realtime`, { withCredentials: true });
    esRef.current = es;

    es.onmessage = (e: MessageEvent<string>) => {
      try {
        const payload = JSON.parse(e.data) as { time: string; channels: Record<string, number> };
        const v = payload.channels?.[channel];
        if (v === undefined) return;

        setLatest(v);
        setData((prev) => [
          ...prev.slice(-(maxPoints - 1)),
          { time: new Date(payload.time).getTime(), value: v },
        ]);
      } catch { /* ignore */ }
    };

    es.onerror = () => es.close();

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [machineId, channel, baseUrl, maxPoints]);

  return (
    <div className="flex flex-col gap-1">
      {latest !== null && (
        <span className="text-sm font-semibold text-slate-700">
          {latest.toFixed(1)} {unit}
        </span>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data}>
          <YAxis domain={['auto', 'auto']} hide />
          <Tooltip
            contentStyle={{ fontSize: 11 }}
            formatter={(v: number) => [`${v.toFixed(2)} ${unit}`, channel]}
            labelFormatter={() => ''}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            dot={false}
            strokeWidth={1.5}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
