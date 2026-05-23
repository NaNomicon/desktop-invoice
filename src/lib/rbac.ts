export const ROLES = {
  ADMIN: 'ADMIN',
  USER: 'USER',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const isAdmin = (role: string): boolean =>
  role.trim().toUpperCase() !== ROLES.USER;

export const canDelete = (role: string): boolean => isAdmin(role);
