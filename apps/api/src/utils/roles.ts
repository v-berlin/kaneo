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

/**
 * Determines the appropriate role for a user based on their email address.
 * Users with email addresses ending in @ong.berlin (but not @student.ong.berlin)
 * should be assigned the "lehrer" (teacher) role.
 *
 * @param email - The user's email address
 * @param defaultRole - The default role to assign if no special role applies (defaults to "member")
 * @returns The role that should be assigned to the user
 */
export function getRoleForEmail(
  email: string,
  defaultRole: Role = ROLES.MEMBER,
): Role {
  // Return default role if email is not provided
  if (!email) {
    return defaultRole;
  }

  // Normalize email to lowercase for comparison
  const normalizedEmail = email.toLowerCase().trim();

  // Extract the domain part (everything after @)
  const atIndex = normalizedEmail.indexOf("@");
  if (atIndex === -1) {
    return defaultRole;
  }
  const domain = normalizedEmail.substring(atIndex + 1);

  // Check if domain is exactly "ong.berlin" (not "student.ong.berlin")
  if (domain === "ong.berlin") {
    return ROLES.LEHRER;
  }

  return defaultRole;
}
