'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Package, Settings, Users, BarChart3,
  Factory, ClipboardList, Shield, ChevronRight, Bell, TrendingUp, Activity,
  LayoutGrid, FileText, CalendarDays,
} from 'lucide-react';
import { cn } from '../lib/utils';

type UserRole = 'ADMIN' | 'MANAGER' | 'OPERATOR' | 'INSPECTOR' | 'VIEWER';

interface MenuItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: UserRole[];
}

const MENU_ITEMS: MenuItem[] = [
  { label: 'AI 대시보드',  href: '/dashboard',    icon: LayoutDashboard, roles: ['ADMIN', 'MANAGER', 'OPERATOR', 'INSPECTOR', 'VIEWER'] },
  { label: '통합 현황',   href: '/overview',     icon: LayoutGrid,      roles: ['ADMIN', 'MANAGER', 'OPERATOR', 'INSPECTOR', 'VIEWER'] },
  { label: '입고 관리',    href: '/lot',           icon: Package,         roles: ['ADMIN', 'MANAGER', 'INSPECTOR'] },
  { label: '작업 지시',    href: '/work-orders',   icon: ClipboardList,   roles: ['ADMIN', 'MANAGER', 'OPERATOR'] },
  { label: '생산 스케줄',  href: '/scheduling',    icon: CalendarDays,    roles: ['ADMIN', 'MANAGER', 'OPERATOR', 'VIEWER'] },
  { label: '설비 현황',    href: '/machines',      icon: Factory,         roles: ['ADMIN', 'MANAGER', 'OPERATOR', 'INSPECTOR', 'VIEWER'] },
  { label: '품질 분석',    href: '/quality',       icon: BarChart3,       roles: ['ADMIN', 'MANAGER', 'INSPECTOR', 'VIEWER'] },
  { label: 'SPC 모니터링', href: '/spc',           icon: TrendingUp,      roles: ['ADMIN', 'MANAGER', 'INSPECTOR', 'VIEWER'] },
  { label: '예측정비 AI',  href: '/pdm',           icon: Activity,        roles: ['ADMIN', 'MANAGER', 'INSPECTOR', 'VIEWER'] },
  { label: '리포트',       href: '/reports',       icon: FileText,        roles: ['ADMIN', 'MANAGER'] },
  { label: '알람 관리',    href: '/alarms',        icon: Bell,            roles: ['ADMIN', 'MANAGER', 'OPERATOR', 'INSPECTOR', 'VIEWER'] },
  { label: '기준 정보',    href: '/master',        icon: Settings,        roles: ['ADMIN', 'MANAGER'] },
  { label: '사용자 관리',  href: '/admin/users',   icon: Users,           roles: ['ADMIN'] },
  { label: '감사 로그',    href: '/admin/audit',   icon: Shield,          roles: ['ADMIN', 'MANAGER'] },
];

interface SidebarProps {
  userRoles?: UserRole[];
}

export function Sidebar({ userRoles = [] }: SidebarProps) {
  const pathname = usePathname();

  const visible = MENU_ITEMS.filter(
    (item) => item.roles.some((r) => userRoles.includes(r)),
  );

  return (
    <nav className="flex flex-col gap-0.5 p-3 pt-4">
      {visible.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href || pathname.startsWith(item.href + '/');

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              active
                ? 'bg-blue-50 text-blue-700'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
            )}
          >
            <Icon size={17} className={active ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'} />
            <span className="flex-1">{item.label}</span>
            {active && <ChevronRight size={14} className="text-blue-400" />}
          </Link>
        );
      })}
    </nav>
  );
}
