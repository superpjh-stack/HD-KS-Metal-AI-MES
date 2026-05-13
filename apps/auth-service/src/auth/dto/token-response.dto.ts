import { UserRole } from '@ks-mes/types';

export class TokenResponseDto {
  accessToken!: string;
  expiresIn!: number;
  tokenType!: 'Bearer';
}

export class MeResponseDto {
  id!: string;
  email!: string;
  name!: string;
  department?: string;
  roles!: UserRole[];
}
