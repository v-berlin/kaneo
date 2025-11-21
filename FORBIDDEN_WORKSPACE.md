# Workspace Creation Restriction

This guide explains how to restrict certain user accounts from creating new workspaces in Kaneo.

## Overview

By default, all users in Kaneo have the ability to create new workspaces. However, administrators may want to restrict certain accounts so they can only access workspaces that have been assigned to them, without the ability to create new ones.

## How It Works

Each user account has a `can_create_workspace` field in the database that controls whether they can create new workspaces:
- `true` (default): User can create new workspaces
- `false`: User cannot create new workspaces and can only access assigned workspaces

When a user with `can_create_workspace = false` attempts to create a workspace, they will receive an error message: "You do not have permission to create workspaces. Please contact an administrator."

## Restricting Workspace Creation for a User

### Using Database SQL

Connect to your PostgreSQL database and run the following SQL command:

```sql
-- Connect to your Kaneo database
psql -U your_username -d kaneo

-- Disable workspace creation for a specific user by email
UPDATE "user" 
SET can_create_workspace = false 
WHERE email = 'user@example.com';

-- Or by user ID
UPDATE "user" 
SET can_create_workspace = false 
WHERE id = 'user-id-here';
```

### Verifying the Setting

To check if a user has workspace creation permissions:

```sql
-- Check by email
SELECT id, name, email, can_create_workspace 
FROM "user" 
WHERE email = 'user@example.com';

-- Check by user ID
SELECT id, name, email, can_create_workspace 
FROM "user" 
WHERE id = 'user-id-here';
```

### Finding User IDs and Emails

If you need to find user information:

```sql
-- List all users and their workspace creation permissions
SELECT id, name, email, can_create_workspace 
FROM "user" 
ORDER BY name;

-- List users who cannot create workspaces
SELECT id, name, email 
FROM "user" 
WHERE can_create_workspace = false;

-- List users who can create workspaces
SELECT id, name, email 
FROM "user" 
WHERE can_create_workspace = true;
```

## Re-enabling Workspace Creation

To allow a user to create workspaces again:

```sql
UPDATE "user" 
SET can_create_workspace = true 
WHERE email = 'user@example.com';
```

## Use Cases

This feature is useful for:

1. **Educational institutions**: Teachers/students can be restricted to their assigned workspaces
2. **Enterprise environments**: Regular employees can only access company-created workspaces
3. **Controlled environments**: Administrators want to manage all workspace creation centrally
4. **Trial accounts**: Limit workspace creation for trial or demo users

## Important Notes

- Restricting workspace creation does NOT affect a user's ability to:
  - Access workspaces they are already members of
  - Accept invitations to new workspaces
  - Create projects, tasks, and other content within assigned workspaces
  
- Users with restricted workspace creation can still:
  - Be invited to existing workspaces
  - Have any role (owner, admin, member, lehrer) within their assigned workspaces
  - Perform all actions allowed by their role within assigned workspaces

- The restriction is checked at the time of workspace creation
- Changes take effect immediately without requiring the user to log out/in

## Bulk Operations

To restrict multiple users at once:

```sql
-- Disable workspace creation for multiple users by email
UPDATE "user" 
SET can_create_workspace = false 
WHERE email IN (
  'user1@example.com',
  'user2@example.com',
  'user3@example.com'
);

-- Disable workspace creation for all users with a specific email domain
UPDATE "user" 
SET can_create_workspace = false 
WHERE email LIKE '%@students.example.com';
```

## Migration

When upgrading to this version, all existing users will have `can_create_workspace = true` by default, maintaining backward compatibility. You'll need to manually update users who should have restricted permissions.

## Troubleshooting

### User Cannot Create Workspace
1. Check the user's `can_create_workspace` value in the database
2. Verify the user is logged in with the correct account
3. Check application logs for any error messages

### User Still Can Create Workspace After Restriction
1. Ensure the database update was successful
2. The user may have cached the old permission - try logging out and back in
3. Check that you updated the correct user account

## Support

For issues or questions about workspace creation restrictions:
- Check the Kaneo documentation at https://kaneo.app/docs
- Open an issue on GitHub: https://github.com/usekaneo/kaneo/issues
- Join the Discord community: https://discord.gg/rU4tSyhXXU
