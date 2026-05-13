import { Injectable } from '@nestjs/common';
import { KeycloakAdapter } from './keycloak.adapter';
import { MeResponseDto, TokenResponseDto } from './dto/token-response.dto';
import { RequestUser } from './jwt.strategy';

@Injectable()
export class AuthService {
  constructor(private readonly keycloak: KeycloakAdapter) {}

  async login(email: string, password: string): Promise<{ token: TokenResponseDto; refreshToken: string }> {
    const tokenSet = await this.keycloak.login(email, password);

    return {
      token: {
        accessToken: tokenSet.access_token,
        expiresIn: tokenSet.expires_in,
        tokenType: 'Bearer',
      },
      refreshToken: tokenSet.refresh_token,
    };
  }

  async refresh(refreshToken: string): Promise<{ token: TokenResponseDto; refreshToken: string }> {
    const tokenSet = await this.keycloak.refresh(refreshToken);

    return {
      token: {
        accessToken: tokenSet.access_token,
        expiresIn: tokenSet.expires_in,
        tokenType: 'Bearer',
      },
      refreshToken: tokenSet.refresh_token,
    };
  }

  async logout(refreshToken: string): Promise<void> {
    await this.keycloak.logout(refreshToken);
  }

  async getMe(accessToken: string, currentUser: RequestUser): Promise<MeResponseDto> {
    const userInfo = await this.keycloak.getUserInfo(accessToken);

    return {
      id: currentUser.id,
      email: currentUser.email,
      name: currentUser.name,
      department: userInfo.department,
      roles: currentUser.roles,
    };
  }
}
