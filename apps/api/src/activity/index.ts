import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { subscribeToEvent } from "../events";
import { canCommentOnTask } from "../utils/authorization";
import toNormalCase from "../utils/to-normal-case";
import createActivity from "./controllers/create-activity";
import createComment from "./controllers/create-comment";
import deleteComment from "./controllers/delete-comment";
import getActivitiesFromTaskId from "./controllers/get-activities";
import updateComment from "./controllers/update-comment";

const activity = new Hono<{
  Variables: {
    userId: string;
  };
}>()
  .get(
    "/:taskId",
    zValidator("param", z.object({ taskId: z.string() })),
    async (c) => {
      const { taskId } = c.req.valid("param");

      const activities = await getActivitiesFromTaskId(taskId);

      return c.json(activities);
    },
  )
  .post(
    "/create",
    zValidator(
      "json",
      z.object({
        taskId: z.string(),
        type: z.string(),
        userId: z.string(),
        content: z.string(),
      }),
    ),
    async (c) => {
      const { taskId, type, userId, content } = c.req.valid("json");

      const activity = await createActivity(taskId, type, userId, content);

      return c.json(activity);
    },
  )
  .post(
    "/comment",
    zValidator(
      "json",
      z.object({
        taskId: z.string(),
        content: z.string(),
      }),
    ),
    async (c) => {
      const { taskId, content } = c.req.valid("json");
      const userId = c.get("userId");

      // Check if user can comment on this task
      const hasCommentAccess = await canCommentOnTask(userId, taskId);
      if (!hasCommentAccess) {
        throw new HTTPException(403, {
          message: "You do not have permission to comment on this task",
        });
      }

      const activity = await createComment(taskId, userId, content);

      return c.json(activity);
    },
  )
  .put(
    "/comment",
    zValidator(
      "json",
      z.object({
        id: z.string(),
        content: z.string(),
      }),
    ),
    async (c) => {
      const { id, content } = c.req.valid("json");
      const userId = c.get("userId");

      const activity = await updateComment(userId, id, content);

      return c.json(activity);
    },
  )
  .delete(
    "/comment",
    zValidator(
      "json",
      z.object({
        id: z.string(),
      }),
    ),
    async (c) => {
      const { id } = c.req.valid("json");
      const userId = c.get("userId");

      await deleteComment(userId, id);

      return c.json({ message: "Comment deleted" });
    },
  );

subscribeToEvent(
  "task.created",
  async ({
    taskId,
    userId,
    type,
    content,
  }: {
    taskId: string;
    userId: string;
    type: string;
    content: string;
  }) => {
    if (!userId || !taskId || !type || !content) {
      return;
    }

    await createActivity(taskId, type, userId, content);
  },
);

subscribeToEvent(
  "task.assignee_changed",
  async ({
    taskId,
    userId,
    type,
    newAssignee,
  }: {
    taskId: string;
    userId: string;
    type: string;
    newAssignee: string;
  }) => {
    await createActivity(
      taskId,
      type,
      userId,
      `assigned the task to ${newAssignee}`,
    );
  },
);

subscribeToEvent(
  "task.unassigned",
  async ({
    taskId,
    userId,
    type,
  }: {
    taskId: string;
    userId: string;
    type: string;
  }) => {
    await createActivity(taskId, type, userId, "unassigned the task");
  },
);

subscribeToEvent(
  "task.status_changed",
  async ({
    taskId,
    userId,
    type,
    oldStatus,
    newStatus,
  }: {
    taskId: string;
    userId: string;
    type: string;
    oldStatus: string;
    newStatus: string;
  }) => {
    await createActivity(
      taskId,
      type,
      userId,
      `changed the status from ${toNormalCase(oldStatus)} to ${toNormalCase(newStatus)}`,
    );
  },
);

subscribeToEvent(
  "task.priority_changed",
  async ({
    taskId,
    userId,
    type,
    oldPriority,
    newPriority,
  }: {
    taskId: string;
    userId: string;
    type: string;
    oldPriority: string;
    newPriority: string;
  }) => {
    await createActivity(
      taskId,
      type,
      userId,
      `changed the priority from ${oldPriority} to ${newPriority}`,
    );
  },
);

subscribeToEvent(
  "task.due_date_changed",
  async ({
    taskId,
    userId,
    type,
    newDueDate,
  }: {
    taskId: string;
    userId: string;
    type: string;
    newDueDate: string;
  }) => {
    await createActivity(
      taskId,
      type,
      userId,
      `changed the due date to ${new Date(newDueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
    );
  },
);

export default activity;
