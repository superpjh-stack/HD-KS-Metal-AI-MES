'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type { Alert } from '@ks-mes/ui';

const NOTIF_URL = process.env.NEXT_PUBLIC_NOTIF_URL ?? 'http://localhost:3005';
const MAX_ALERTS = 20;

export function useAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io(NOTIF_URL, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnectionDelay: 2000,
      reconnectionAttempts: Infinity,
    });

    socketRef.current = socket;

    socket.on('connect',    () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('alert', (raw: {
      id: string;
      level: 'info' | 'warning' | 'critical';
      title: string;
      message: string;
      time: string;
    }) => {
      const alert: Alert = { ...raw, time: new Date(raw.time) };
      setAlerts((prev) => [alert, ...prev].slice(0, MAX_ALERTS));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const dismiss = (id: string) =>
    setAlerts((prev) => prev.filter((a) => a.id !== id));

  return { alerts, connected, dismiss };
}
