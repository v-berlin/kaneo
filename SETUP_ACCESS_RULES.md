# Access Rules Setup Guide

This guide explains how to configure access rules in Kaneo, specifically for the "Lehrer" (Teacher) role with restricted permissions.

## Overview

Kaneo supports role-based access control (RBAC) at the workspace level. Each user in a workspace has a role that determines their permissions.

## Available Roles

### Standard Roles
- **owner**: Full access to all workspace features and settings
- **admin**: Full access to workspace content, but limited administrative capabilities
- **member**: Standard user with full read, create, update, and delete access to tasks

### Restricted Roles
- **lehrer** (Teacher): Limited access role with the following permissions:
  - **Read Access**: Can view all tasks in the workspace
  - **Create Access**: Can create new tasks (automatically set as the creator)
  - **Update Access**: Can only update tasks they created
  - **Delete Access**: Can only delete tasks they created

## How to Assign the "Lehrer" Role

The "Lehrer" role is assigned at the workspace member level. Follow these steps to assign this role to a user:

### Method 1: Database Direct Assignment (For Self-Hosted Instances)

If you have direct access to your PostgreSQL database, you can assign the role using SQL:

```sql
-- Connect to your Kaneo database
psql -U your_username -d kaneo

-- Update a user's role in a specific workspace
UPDATE workspace_member 
SET role = 'lehrer' 
WHERE user_id = '<user-id>' 
  AND workspace_id = '<workspace-id>';
```

To find the user_id and workspace_id:

```sql
-- Find user ID
SELECT id, email, name FROM "user" WHERE email = 'teacher@example.com';

-- Find workspace ID
SELECT id, name FROM workspace WHERE name = 'Your Workspace Name';

-- Verify the role was set correctly
SELECT 
  u.email,
  w.name as workspace_name,
  wm.role
FROM workspace_member wm
JOIN "user" u ON wm.user_id = u.id
JOIN workspace w ON wm.workspace_id = w.id
WHERE u.email = 'teacher@example.com';
```

### Method 2: API Integration (For Programmatic Assignment)

You can also update user roles through the Better Auth API that Kaneo uses. This requires admin access to the workspace.

```typescript
// Example: Update user role via API
import { auth } from "./auth";

async function assignLehrerRole(userId: string, workspaceId: string) {
  await auth.api.updateMember({
    headers: yourAuthHeaders,
    body: {
      userId: userId,
      organizationId: workspaceId,
      role: "lehrer"
    }
  });
}
```

### Method 3: Invitation with Role

When inviting a new user to your workspace, you can specify their role directly:

```typescript
// Example: Invite user with lehrer role
await auth.api.inviteUser({
  headers: yourAuthHeaders,
  body: {
    email: "newteacher@example.com",
    organizationId: workspaceId,
    role: "lehrer"
  }
});
```

## Permission Details

### What Teachers (Lehrer) Can Do

✅ **Read Operations**
- View all tasks in projects within their workspace
- View task details, comments, and activity
- View project information
- Export tasks from projects

✅ **Create Operations**
- Create new tasks in any project
- Add descriptions, priorities, due dates, and assign tasks
- Their user ID is automatically recorded as the task creator

✅ **Update Operations (Own Tasks Only)**
- Update task title
- Update task description
- Change task status
- Change task priority
- Update task due date
- Change task assignee
- Move tasks between columns

### What Teachers (Lehrer) Cannot Do

❌ **Update Operations**
- Cannot modify tasks created by other users
- Cannot update tasks they didn't create

❌ **Delete Operations**
- Cannot delete tasks created by other users
- Can only delete their own tasks

❌ **Administrative Operations**
- Cannot manage workspace settings
- Cannot manage user roles
- Cannot delete projects

## Technical Implementation

The role-based access control is implemented in the following locations:

1. **Database Schema**: `apps/api/src/database/schema.ts`
   - The `workspace_member` table stores the user's role
   - The `task` table has a `created_by` field to track task ownership

2. **Authorization Logic**: `apps/api/src/utils/authorization.ts`
   - `canModifyTask()`: Checks if a user can modify/delete a task
   - `canCreateTask()`: Checks if a user can create tasks in a project
   - `canReadTasks()`: Checks if a user can view tasks in a project

3. **Task Routes**: `apps/api/src/task/index.ts`
   - All task CRUD operations include authorization checks
   - Teachers are restricted based on task ownership

## Migration

When upgrading to this version, a database migration will automatically add the `created_by` field to existing tasks. Note that:

- Existing tasks will have `created_by` set to `NULL`
- New tasks will automatically track their creator
- Teachers will only be able to modify tasks created after this migration

## Example Scenarios

### Scenario 1: Teacher Creates and Manages Their Own Tasks

1. Teacher logs into workspace
2. Creates task "Grade Assignment 1" ✅
3. Updates task status to "In Progress" ✅
4. Updates task description ✅
5. Deletes the task ✅

### Scenario 2: Teacher Attempts to Modify Another User's Task

1. Teacher logs into workspace
2. Views all tasks (can see task created by Admin) ✅
3. Attempts to update Admin's task ❌ (403 Forbidden error)
4. Attempts to delete Admin's task ❌ (403 Forbidden error)

### Scenario 3: Admin Manages All Tasks

1. Admin logs into workspace
2. Views all tasks ✅
3. Updates any task (including Teacher's tasks) ✅
4. Deletes any task ✅

## Troubleshooting

### Users Can't Create Tasks
- Verify the user is a member of the workspace
- Check that they have any role assigned (including "lehrer")

### Teachers Can't Modify Their Own Tasks
- Verify the task has a `created_by` value that matches the user's ID
- Check the database migration was applied successfully
- Ensure the user's role is correctly set to "lehrer"

### Permission Errors
- Check the user's role in the workspace_member table
- Verify the task exists and belongs to the correct project
- Confirm the project belongs to the workspace the user has access to

## Security Considerations

- Always use parameterized queries to prevent SQL injection
- The `created_by` field uses `ON DELETE SET NULL` to preserve tasks when a user is deleted
- Authorization checks happen on every API call, not just on the client side
- Role changes take effect immediately without requiring a logout/login

## Support

For issues or questions about access control:
- Check the Kaneo documentation at https://kaneo.app/docs
- Open an issue on GitHub: https://github.com/usekaneo/kaneo/issues
- Join the Discord community: https://discord.gg/rU4tSyhXXU
