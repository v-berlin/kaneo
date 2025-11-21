/**
 * Workspace role constants
 */
export const ROLES = {
  OWNER: "owner",
  ADMIN: "admin",
  MEMBER: "member",
  LEHRER: "lehrer",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];
