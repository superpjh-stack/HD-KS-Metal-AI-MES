'use client';

import { useSession } from 'next-auth/react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import type { UserRole } from '@ks-mes/types';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRoles?: UserRole[];
}

export function AuthGuard({ children, requiredRoles }: AuthGuardProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  if (status === 'unauthenticated') return null;

  if (requiredRoles && requiredRoles.length > 0) {
    const userRoles = session?.user?.roles ?? [];
    const hasRole = requiredRoles.some((r) => userRoles.includes(r));
    if (!hasRole) {
      return (
        <div className="flex h-64 flex-col items-center justify-center gap-2 text-slate-500">
          <span className="text-4xl">🚫</span>
          <p className="text-sm font-medium">이 페이지에 접근할 권한이 없습니다.</p>
        </div>
      );
    }
  }

  return <>{children}</>;
}
