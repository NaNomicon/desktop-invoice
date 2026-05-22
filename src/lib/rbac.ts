export const ROLES = {
  ADMIN: 'ADMIN',
  USER: 'USER',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

/**
 * Check if user is admin (any user_id that is not 'USER').
 * Matches VB.NET rights() function:
 *   If user_id = "USER" Then ... 'restricted'
 *   Else ... 'full access'
 */
export const isAdmin = (userId: string): boolean =>
  userId.toUpperCase() !== ROLES.USER;

/** Admin or role that has delete permission */
export const canDelete = (userId: string): boolean => isAdmin(userId);
