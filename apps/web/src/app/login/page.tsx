'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { Factory, Loader2 } from 'lucide-react';

const IS_DEV = process.env.NODE_ENV === 'development';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [devUser, setDevUser] = useState('admin');

  const handleKeycloak = async () => {
    setLoading(true);
    await signIn('keycloak', { callbackUrl: '/dashboard' });
  };

  const handleDev = async () => {
    setLoading(true);
    await signIn('dev-credentials', { username: devUser, callbackUrl: '/dashboard' });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 to-blue-900">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600">
            <Factory size={28} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">광성정밀 AI-MES</h1>
            <p className="mt-1 text-sm text-slate-500">AI 제조 스마트공장 시스템</p>
          </div>
        </div>

        {IS_DEV ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
              개발 모드 — Keycloak 없이 로그인
            </div>
            <select
              value={devUser}
              onChange={(e) => setDevUser(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none"
            >
              <option value="admin">admin — ADMIN 전체 권한</option>
              <option value="manager">manager — MANAGER 권한</option>
              <option value="viewer">viewer — VIEWER 권한</option>
            </select>
            <button
              onClick={handleDev}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-blue-700 active:scale-95 disabled:opacity-60"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : '🔑'} 개발 계정으로 로그인
            </button>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <div className="flex-1 border-t border-slate-200" />
              <span>또는</span>
              <div className="flex-1 border-t border-slate-200" />
            </div>
            <button
              onClick={handleKeycloak}
              disabled={loading}
              className="w-full rounded-lg border border-slate-200 py-2.5 text-sm text-slate-600 transition hover:border-blue-300 hover:text-blue-700 disabled:opacity-60"
            >
              Keycloak으로 로그인
            </button>
          </div>
        ) : (
          <button
            onClick={handleKeycloak}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-blue-700 active:scale-95 disabled:opacity-60"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : '🔑'} 로그인
          </button>
        )}

        <p className="mt-4 text-center text-xs text-slate-400">
          비밀번호 분실 시 IT 담당자 문의 (내선 123)
        </p>
      </div>
    </div>
  );
}
