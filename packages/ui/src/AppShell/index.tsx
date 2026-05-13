'use client';

import { useState } from 'react';
import { Bell, Menu, X, LogOut, ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';

interface AppShellProps {
  children: React.ReactNode;
  sidebar: React.ReactNode;
  userName?: string;
  alertCount?: number;
  onLogout?: () => void;
}

export function AppShell({ children, sidebar, userName, alertCount = 0, onLogout }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-50">
      {/* Header */}
      <header className="flex h-[60px] shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <span className="text-base font-bold text-slate-800">광성정밀 AI-MES</span>
        </div>

        <div className="flex items-center gap-3">
          <button className="relative rounded-full p-1.5 text-slate-500 hover:bg-slate-100">
            <Bell size={20} />
            {alertCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                {alertCount > 9 ? '9+' : alertCount}
              </span>
            )}
          </button>

          {userName && (
            <div className="flex items-center gap-1.5 text-sm text-slate-700">
              <span className="font-medium">{userName}</span>
              <ChevronDown size={14} />
            </div>
          )}

          {onLogout && (
            <button
              onClick={onLogout}
              className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"
              title="로그아웃"
            >
              <LogOut size={18} />
            </button>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className={cn(
            'shrink-0 overflow-y-auto border-r border-slate-200 bg-white transition-all duration-200',
            sidebarOpen ? 'w-60' : 'w-0',
          )}
        >
          {sidebarOpen && sidebar}
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
