import { and, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../database";
import {
  projectTable,
  taskTable,
  workspaceUserTable,
} from "../database/schema";

/**
 * Get the role of a user in a workspace
 */
export async function getUserWorkspaceRole(
  userId: string,
  workspaceId: string,
): Promise<string | null> {
  const [member] = await db
    .select({ role: workspaceUserTable.role })
    .from(workspaceUserTable)
    .where(
      and(
        eq(workspaceUserTable.userId, userId),
        eq(workspaceUserTable.workspaceId, workspaceId),
      ),
    )
    .limit(1);

  return member?.role || null;
}

/**
 * Check if a user has permission to modify a task
 * Teachers (lehrer role) can only modify their own tasks
 * Other roles can modify any task in their workspace
 */
export async function canModifyTask(
  userId: string,
  taskId: string,
): Promise<boolean> {
  // Get the task with its project info
  const [task] = await db
    .select({
      taskId: taskTable.id,
      createdBy: taskTable.createdBy,
      workspaceId: projectTable.workspaceId,
    })
    .from(taskTable)
    .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
    .where(eq(taskTable.id, taskId))
    .limit(1);

  if (!task) {
    throw new HTTPException(404, {
      message: "Task not found",
    });
  }

  // Get user's role in the workspace
  const role = await getUserWorkspaceRole(userId, task.workspaceId);

  if (!role) {
    return false;
  }

  // Teachers can only modify their own tasks
  if (role === "lehrer") {
    return task.createdBy === userId;
  }

  // Other roles (admin, member, owner) can modify any task
  return true;
}

/**
 * Check if a user can create tasks in a workspace
 * All workspace members can create tasks
 */
export async function canCreateTask(
  userId: string,
  projectId: string,
): Promise<boolean> {
  // Get the project's workspace
  const [project] = await db
    .select({ workspaceId: projectTable.workspaceId })
    .from(projectTable)
    .where(eq(projectTable.id, projectId))
    .limit(1);

  if (!project) {
    throw new HTTPException(404, {
      message: "Project not found",
    });
  }

  // Check if user is a member of the workspace
  const role = await getUserWorkspaceRole(userId, project.workspaceId);

  return role !== null;
}

/**
 * Check if a user can read tasks in a project
 * All workspace members can read tasks
 */
export async function canReadTasks(
  userId: string,
  projectId: string,
): Promise<boolean> {
  // Get the project's workspace
  const [project] = await db
    .select({ workspaceId: projectTable.workspaceId })
    .from(projectTable)
    .where(eq(projectTable.id, projectId))
    .limit(1);

  if (!project) {
    throw new HTTPException(404, {
      message: "Project not found",
    });
  }

  // Check if user is a member of the workspace
  const role = await getUserWorkspaceRole(userId, project.workspaceId);

  return role !== null;
}
