import type { AuthOptions, Session } from 'next-auth';
import KeycloakProvider from 'next-auth/providers/keycloak';
import CredentialsProvider from 'next-auth/providers/credentials';
import type { JWT } from 'next-auth/jwt';

const IS_DEV = process.env.NODE_ENV === 'development';

function decodeJwt(token: string): { exp?: number; realm_access?: { roles: string[] } } {
  try {
    return JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
  } catch {
    return {};
  }
}

async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    const url = `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/token`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: process.env.KEYCLOAK_CLIENT_ID!,
        client_secret: process.env.KEYCLOAK_CLIENT_SECRET!,
        refresh_token: token.refreshToken as string,
      }),
    });

    const data = await res.json() as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };

    return {
      ...token,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      accessTokenExpires: Date.now() + data.expires_in * 1000,
      error: undefined,
    };
  } catch {
    return { ...token, error: 'RefreshAccessTokenError' };
  }
}

const DEV_USERS: Record<string, { name: string; roles: string[] }> = {
  admin:    { name: '개발자 (Admin)',   roles: ['ADMIN', 'MANAGER', 'INSPECTOR', 'VIEWER'] },
  manager:  { name: '공장장 (Manager)', roles: ['MANAGER', 'INSPECTOR', 'VIEWER'] },
  viewer:   { name: '모니터 (Viewer)',  roles: ['VIEWER'] },
};

export const authOptions: AuthOptions = {
  providers: [
    ...(IS_DEV
      ? [
          CredentialsProvider({
            id: 'dev-credentials',
            name: '개발 계정',
            credentials: {
              username: { label: '계정', type: 'text', placeholder: 'admin / manager / viewer' },
            },
            async authorize(credentials) {
              const key = (credentials?.username ?? 'admin').toLowerCase();
              const user = DEV_USERS[key] ?? DEV_USERS.admin;
              return { id: key, name: user.name, email: `${key}@dev.local`, roles: user.roles };
            },
          }),
        ]
      : []),
    KeycloakProvider({
      clientId: process.env.KEYCLOAK_CLIENT_ID!,
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET!,
      issuer: `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}`,
    }),
  ],
  callbacks: {
    async jwt({ token, account, user }) {
      // 개발용 Credentials 로그인
      if (user && 'roles' in user) {
        return {
          ...token,
          accessToken: 'dev-token',
          accessTokenExpires: Date.now() + 24 * 60 * 60 * 1000,
          roles: (user as { roles: string[] }).roles,
        };
      }

      // 최초 로그인 (Keycloak)
      if (account) {
        const decoded = decodeJwt(account.access_token!);
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          accessTokenExpires: Date.now() + (account.expires_in as number) * 1000,
          roles: decoded.realm_access?.roles ?? [],
        };
      }

      // 토큰 유효시간 내 → 그대로 반환
      if (Date.now() < (token.accessTokenExpires as number) - 30_000) {
        return token;
      }

      // 만료 임박 → 갱신
      return refreshAccessToken(token);
    },

    async session({ session, token }): Promise<Session> {
      return {
        ...session,
        accessToken: token.accessToken as string,
        error: token.error as string | undefined,
        user: {
          ...session.user,
          roles: (token.roles as string[]) ?? [],
        },
      };
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: { strategy: 'jwt' },
};

// next-auth 타입 확장
declare module 'next-auth' {
  interface Session {
    accessToken?: string;
    error?: string;
    user: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      roles: string[];
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpires?: number;
    roles?: string[];
    error?: string;
  }
}
