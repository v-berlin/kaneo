import { useContext } from "react";
import { AuthContext } from "@/components/providers/auth-provider";

/**
 * Hook to check if the current user has permission to create workspaces
 * @returns boolean indicating if the user can create workspaces
 */
export function useCanCreateWorkspace(): boolean {
  const { user } = useContext(AuthContext);

  // If user is not loaded or canCreateWorkspace is not defined, default to true for backward compatibility
  // This ensures existing users without the field can still create workspaces
  if (!user) {
    return false;
  }

  // TypeScript doesn't know about our custom field, so we need to cast it
  const userWithPermission = user as typeof user & {
    canCreateWorkspace?: boolean;
  };

  // Default to true if the field doesn't exist (backward compatibility)
  return userWithPermission.canCreateWorkspace ?? true;
}
