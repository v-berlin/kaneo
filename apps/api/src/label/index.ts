import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { canAssignLabelToTask } from "../utils/authorization";
import createLabel from "./controllers/create-label";
import deleteLabel from "./controllers/delete-label";
import getLabel from "./controllers/get-label";
import getLabelsByTaskId from "./controllers/get-labels-by-task-id";
import getLabelsByWorkspaceId from "./controllers/get-labels-by-workspace-id";
import updateLabel from "./controllers/update-label";

const label = new Hono<{
  Variables: {
    userId: string;
  };
}>()
  .get(
    "/task/:taskId",
    zValidator("param", z.object({ taskId: z.string() })),
    async (c) => {
      const { taskId } = c.req.valid("param");
      const labels = await getLabelsByTaskId(taskId);
      return c.json(labels);
    },
  )
  .get(
    "/workspace/:workspaceId",
    zValidator("param", z.object({ workspaceId: z.string() })),
    async (c) => {
      const { workspaceId } = c.req.valid("param");
      const labels = await getLabelsByWorkspaceId(workspaceId);
      return c.json(labels);
    },
  )
  .post(
    "/",
    zValidator(
      "json",
      z.object({
        name: z.string(),
        color: z.string(),
        taskId: z.string().optional(),
        workspaceId: z.string(),
      }),
    ),
    async (c) => {
      const { name, color, taskId, workspaceId } = c.req.valid("json");
      const userId = c.get("userId");

      // Check if user can assign label to this task (if taskId is provided)
      if (taskId) {
        const hasAssignAccess = await canAssignLabelToTask(userId, taskId);
        if (!hasAssignAccess) {
          throw new HTTPException(403, {
            message: "You do not have permission to assign labels to this task",
          });
        }
      }

      const label = await createLabel(name, color, taskId, workspaceId);
      return c.json(label);
    },
  )
  .delete("/:id", async (c) => {
    const { id } = c.req.param();
    const userId = c.get("userId");

    // Get the label to check if it's associated with a task
    const label = await getLabel(id);

    // Check if user can remove label from this task (if taskId exists)
    if (label.taskId) {
      const hasAssignAccess = await canAssignLabelToTask(userId, label.taskId);
      if (!hasAssignAccess) {
        throw new HTTPException(403, {
          message: "You do not have permission to remove labels from this task",
        });
      }
    }

    const deletedLabel = await deleteLabel(id);
    return c.json(deletedLabel);
  })
  .get("/:id", zValidator("param", z.object({ id: z.string() })), async (c) => {
    const { id } = c.req.valid("param");
    const label = await getLabel(id);
    return c.json(label);
  })
  .put(
    "/:id",
    zValidator("param", z.object({ id: z.string() })),
    zValidator("json", z.object({ name: z.string(), color: z.string() })),
    async (c) => {
      const { id } = c.req.valid("param");
      const { name, color } = c.req.valid("json");
      const label = await updateLabel(id, name, color);
      return c.json(label);
    },
  );

export default label;
