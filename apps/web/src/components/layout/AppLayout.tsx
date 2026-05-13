'use client';

import { signOut, useSession } from 'next-auth/react';
import { AppShell, Sidebar } from '@ks-mes/ui';
import type { UserRole } from '@ks-mes/types';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const userRoles = (session?.user?.roles ?? []) as UserRole[];

  return (
    <AppShell
      sidebar={<Sidebar userRoles={userRoles} />}
      userName={session?.user?.name ?? undefined}
      onLogout={() => signOut({ callbackUrl: '/login' })}
    >
      {children}
    </AppShell>
  );
}
