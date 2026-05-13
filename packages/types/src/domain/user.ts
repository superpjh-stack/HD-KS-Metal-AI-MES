export type UserRole = 'ADMIN' | 'MANAGER' | 'OPERATOR' | 'INSPECTOR' | 'VIEWER';

export interface User {
  id: string;
  email: string;
  name: string;
  department?: string;
  roles: UserRole[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthUser extends User {
  permissions: string[];
}
