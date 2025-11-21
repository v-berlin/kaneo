# Workspace Creation Permission Management

## Overview

This document explains how to manage which users can create new workspaces in Kaneo. By default, all users have permission to create workspaces. However, you can restrict certain accounts so they can only access workspaces that have been assigned to them.

## Database Field

The permission is controlled by the `can_create_workspace` boolean field in the `user` table.

- `true` (default): User can create new workspaces
- `false`: User cannot create new workspaces and can only access assigned workspaces

## How to Restrict a User

### Using PostgreSQL Client

Connect to your PostgreSQL database and run:

```sql
-- Disable workspace creation for a specific user by email
UPDATE "user"
SET can_create_workspace = false
WHERE email = 'user@example.com';

-- Verify the change
SELECT id, name, email, can_create_workspace
FROM "user"
WHERE email = 'user@example.com';
```

### Using psql Command Line

```bash
# Connect to the database
psql -U kaneo_user -d kaneo -h localhost

# Disable workspace creation
UPDATE "user" SET can_create_workspace = false WHERE email = 'user@example.com';
```

### Using Docker

If you're running Kaneo with Docker Compose:

```bash
# Connect to the PostgreSQL container
docker compose exec postgres psql -U kaneo_user -d kaneo

# Run the update command
UPDATE "user" SET can_create_workspace = false WHERE email = 'user@example.com';
```

## How to Re-enable Workspace Creation

To allow a user to create workspaces again:

```sql
UPDATE "user"
SET can_create_workspace = true
WHERE email = 'user@example.com';
```

## Bulk Operations

### Disable workspace creation for multiple users:

```sql
UPDATE "user"
SET can_create_workspace = false
WHERE email IN ('user1@example.com', 'user2@example.com', 'user3@example.com');
```

### Disable workspace creation for all users except specific ones:

```sql
UPDATE "user"
SET can_create_workspace = false
WHERE email NOT IN ('admin@example.com', 'owner@example.com');
```

### Check all users with workspace creation disabled:

```sql
SELECT id, name, email, created_at
FROM "user"
WHERE can_create_workspace = false
ORDER BY created_at DESC;
```

## What Happens When a User is Restricted

When a user has `can_create_workspace` set to `false`:

1. **UI Changes:**
   - The "Create Workspace" button is hidden from the workspace switcher
   - The "Create workspace" option is removed from the command palette (Cmd/Ctrl+K)
   - Keyboard shortcuts for creating workspaces are disabled
   - Access to the `/dashboard/workspace/create` route is blocked

2. **API Protection:**
   - If a restricted user attempts to create a workspace via the API (e.g., through direct API calls), the request will be rejected with an error message: "You do not have permission to create workspaces"

3. **Workspace Access:**
   - Restricted users can still access all workspaces they are members of
   - They can be invited to new workspaces by workspace admins/owners
   - All other workspace features remain fully functional

## Setting Default for New Users

The default value for new users is `true` (can create workspaces). This is set at the database level via the migration.

If you want to change the default for future users, you would need to:

1. Update the schema to change the default value
2. Create and run a new migration

However, this is typically handled through code changes and migrations, not manual database updates.

## Best Practices

1. **Regular Review**: Periodically review which users have workspace creation permissions
2. **Documentation**: Keep track of why certain users are restricted
3. **Communication**: Inform users when their permissions are changed
4. **Backup**: Always backup your database before making bulk permission changes

## Example: Organization-wide Policy

If you want to implement a policy where only admins can create workspaces:

```sql
-- First, get the list of current workspace owners/admins
SELECT DISTINCT u.id, u.email, u.name
FROM "user" u
JOIN workspace_member wm ON u.id = wm.user_id
WHERE wm.role IN ('admin', 'owner');

-- Disable workspace creation for everyone
UPDATE "user" SET can_create_workspace = false;

-- Re-enable only for admins/owners (replace with actual admin emails)
UPDATE "user"
SET can_create_workspace = true
WHERE email IN (
  SELECT DISTINCT u.email
  FROM "user" u
  JOIN workspace_member wm ON u.id = wm.user_id
  WHERE wm.role IN ('admin', 'owner')
);
```

## Troubleshooting

### User still sees create workspace button
- Clear browser cache and cookies
- Ensure the user logs out and logs back in to refresh their session
- Verify the database change was applied: `SELECT can_create_workspace FROM "user" WHERE email = 'user@example.com';`

### User gets permission error
- This is expected behavior when a restricted user tries to create a workspace
- Verify they have `can_create_workspace = false` in the database
- Ensure they are a member of at least one workspace to continue using the application

## Support

If you need additional help or want to implement more complex permission models, please refer to the main Kaneo documentation or contact support.
