import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@ks-mes/types';

export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  realm_access?: { roles: string[] };
  preferred_username: string;
  department?: string;
}

export interface RequestUser {
  id: string;
  email: string;
  name: string;
  roles: UserRole[];
  department?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    const keycloakUrl = config.getOrThrow('KEYCLOAK_URL');
    const realm = config.getOrThrow('KEYCLOAK_REALM');
    const clientId = config.getOrThrow('KEYCLOAK_CLIENT_ID');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 10,
        jwksUri: `${keycloakUrl}/realms/${realm}/protocol/openid-connect/certs`,
      }),
      issuer: `${keycloakUrl}/realms/${realm}`,
      audience: clientId,
      algorithms: ['RS256'],
    });
  }

  validate(payload: JwtPayload): RequestUser {
    const validRoles: UserRole[] = ['ADMIN', 'MANAGER', 'OPERATOR', 'INSPECTOR', 'VIEWER'];
    const roles = (payload.realm_access?.roles ?? []).filter(
      (r): r is UserRole => validRoles.includes(r as UserRole),
    );
    return { id: payload.sub, email: payload.email, name: payload.name, roles, department: payload.department };
  }
}
