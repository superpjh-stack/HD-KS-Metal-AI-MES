import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { UserRole } from '@ks-mes/types';

export interface KeycloakTokenSet {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

export interface KeycloakUserInfo {
  sub: string;
  email: string;
  name: string;
  preferred_username: string;
  realm_access?: { roles: string[] };
  department?: string;
}

@Injectable()
export class KeycloakAdapter {
  private readonly logger = new Logger(KeycloakAdapter.name);
  private readonly http: AxiosInstance;
  private readonly realm: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = config.getOrThrow('KEYCLOAK_URL');
    this.realm = config.getOrThrow('KEYCLOAK_REALM');
    this.clientId = config.getOrThrow('KEYCLOAK_CLIENT_ID');
    this.clientSecret = config.getOrThrow('KEYCLOAK_CLIENT_SECRET');

    this.http = axios.create({
      baseURL: `${this.baseUrl}/realms/${this.realm}/protocol/openid-connect`,
      timeout: 10_000,
    });
  }

  async login(email: string, password: string): Promise<KeycloakTokenSet> {
    try {
      const params = new URLSearchParams({
        grant_type: 'password',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        username: email,
        password,
        scope: 'openid profile email',
      });

      const { data } = await this.http.post<KeycloakTokenSet>('/token', params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      return data;
    } catch {
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
    }
  }

  async refresh(refreshToken: string): Promise<KeycloakTokenSet> {
    try {
      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
      });

      const { data } = await this.http.post<KeycloakTokenSet>('/token', params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      return data;
    } catch {
      throw new UnauthorizedException('세션이 만료되었습니다. 다시 로그인해주세요.');
    }
  }

  async logout(refreshToken: string): Promise<void> {
    try {
      const params = new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
      });

      await this.http.post('/logout', params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
    } catch (err) {
      this.logger.warn('Keycloak logout error (ignored)', err);
    }
  }

  async getUserInfo(accessToken: string): Promise<KeycloakUserInfo> {
    try {
      const { data } = await this.http.get<KeycloakUserInfo>('/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return data;
    } catch {
      throw new UnauthorizedException('유효하지 않은 토큰입니다.');
    }
  }

  extractRoles(userInfo: KeycloakUserInfo): UserRole[] {
    const realmRoles = userInfo.realm_access?.roles ?? [];
    const validRoles: UserRole[] = ['ADMIN', 'MANAGER', 'OPERATOR', 'INSPECTOR', 'VIEWER'];
    return realmRoles.filter((r): r is UserRole => validRoles.includes(r as UserRole));
  }

  get jwksUri(): string {
    return `${this.baseUrl}/realms/${this.realm}/protocol/openid-connect/certs`;
  }

  get issuer(): string {
    return `${this.baseUrl}/realms/${this.realm}`;
  }
}
