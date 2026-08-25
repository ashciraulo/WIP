import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { syncIdleGapsForTaskChange } from "../services/idleTime";
import { DELAY_REASONS, DelayReason } from "../domain";

export const tasksRouter = Router();

/**
 * Slider-driven completion % update. Deliberately a single cheap call with
 * no confirmation step — this is the interaction staff will use most, so it
 * has to be frictionless. Crossing 0% for the first time auto-starts the
 * task (sets status IN_PROGRESS + startedAt) since that's implied by any
 * progress being logged; it does NOT auto-complete at 100 — completion is
 * its own explicit action so a stray drag to 100 can't silently close a task.
 */
tasksRouter.patch("/:id/percent", requireAuth, async (req, res) => {
  const body = z.object({ percent: z.number().int().min(0).max(100) }).safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "percent (0-100) required" });

  const task = await prisma.task.findUnique({ where: { id: req.params.id } });
  if (!task) return res.status(404).json({ error: "Task not found" });

  const data: Record<string, unknown> = { completionPercent: body.data.percent };
  if (task.status === "NOT_STARTED" && body.data.percent > 0) {
    data.status = "IN_PROGRESS";
    data.startedAt = new Date();
  }

  const updated = await prisma.task.update({ where: { id: task.id }, data });

  await prisma.taskEvent.create({
    data: {
      taskId: task.id,
      userId: req.user!.id,
      type: "PERCENT_UPDATED",
      fromValue: String(task.completionPercent),
      toValue: String(body.data.percent),
    },
  });
  if (data.status === "IN_PROGRESS") {
    await prisma.taskEvent.create({ data: { taskId: task.id, userId: req.user!.id, type: "STARTED" } });
    await syncIdleGapsForTaskChange(task.id);
  }

  res.json(updated);
});

/** Explicit "mark complete" — separate from the slider on purpose, see above. */
tasksRouter.post("/:id/complete", requireAuth, async (req, res) => {
  const task = await prisma.task.findUnique({ where: { id: req.params.id } });
  if (!task) return res.status(404).json({ error: "Task not found" });
  if (task.status === "COMPLETE") return res.json(task);

  const updated = await prisma.task.update({
    where: { id: task.id },
    data: { status: "COMPLETE", completionPercent: 100, completedAt: new Date() },
  });

  await prisma.taskEvent.create({ data: { taskId: task.id, userId: req.user!.id, type: "COMPLETED" } });
  await syncIdleGapsForTaskChange(task.id);

  res.json(updated);
});

/** Reopen a task that was marked complete by mistake. */
tasksRouter.post("/:id/reopen", requireAuth, async (req, res) => {
  const task = await prisma.task.findUnique({ where: { id: req.params.id } });
  if (!task) return res.status(404).json({ error: "Task not found" });

  const updated = await prisma.task.update({
    where: { id: task.id },
    data: { status: "IN_PROGRESS", completedAt: null },
  });
  await prisma.taskEvent.create({
    data: { taskId: task.id, userId: req.user!.id, type: "STATUS_CHANGED", fromValue: "COMPLETE", toValue: "IN_PROGRESS" },
  });
  res.json(updated);
});

tasksRouter.patch("/:id/assign", requireAuth, async (req, res) => {
  const body = z.object({ assignedUserId: z.string().nullable() }).safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "assignedUserId required (or null to unassign)" });

  const task = await prisma.task.findUnique({ where: { id: req.params.id } });
  if (!task) return res.status(404).json({ error: "Task not found" });

  const updated = await prisma.task.update({ where: { id: task.id }, data: { assignedUserId: body.data.assignedUserId } });
  await prisma.taskEvent.create({
    data: {
      taskId: task.id,
      userId: req.user!.id,
      type: "ASSIGNED",
      fromValue: task.assignedUserId,
      toValue: body.data.assignedUserId,
    },
  });
  res.json(updated);
});

const REASONS = DELAY_REASONS;

/**
 * Change the expected completion date. Always requires a reason so the
 * analytics endpoint has something to aggregate — this is the one place we
 * ask for slightly more than the bare minimum, because the whole point of
 * tracking it is to see *why* dates move, not just that they did.
 */
tasksRouter.post("/:id/due-date", requireAuth, async (req, res) => {
  const body = z
    .object({
      newDate: z.coerce.date(),
      reason: z.enum(REASONS),
      note: z.string().max(500).optional(),
    })
    .safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "newDate and reason are required", details: body.error.flatten() });

  const task = await prisma.task.findUnique({ where: { id: req.params.id } });
  if (!task) return res.status(404).json({ error: "Task not found" });

  const isFirstDate = !task.expectedCompletionDate;

  const updated = await prisma.task.update({
    where: { id: task.id },
    data: {
      expectedCompletionDate: body.data.newDate,
      originalExpectedCompletionDate: isFirstDate ? body.data.newDate : task.originalExpectedCompletionDate,
    },
  });

  await prisma.dueDateChangeLog.create({
    data: {
      taskId: task.id,
      userId: req.user!.id,
      oldDate: task.expectedCompletionDate,
      newDate: body.data.newDate,
      reason: body.data.reason as DelayReason,
      note: body.data.note,
    },
  });
  await prisma.taskEvent.create({
    data: {
      taskId: task.id,
      userId: req.user!.id,
      type: "DUE_DATE_CHANGED",
      fromValue: task.expectedCompletionDate?.toISOString() ?? null,
      toValue: body.data.newDate.toISOString(),
    },
  });

  res.json(updated);
});

/** Add a task line to a job. */
tasksRouter.post("/", requireAuth, async (req, res) => {
  const body = z
    .object({
      jobId: z.string(),
      name: z.string().min(1),
      assignedUserId: z.string().nullable().optional(),
      expectedCompletionDate: z.coerce.date().optional(),
    })
    .safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "jobId and name are required" });

  const maxSeq = await prisma.task.aggregate({
    where: { jobId: body.data.jobId },
    _max: { sequence: true },
  });

  const task = await prisma.task.create({
    data: {
      jobId: body.data.jobId,
      name: body.data.name,
      sequence: (maxSeq._max.sequence ?? 0) + 1,
      assignedUserId: body.data.assignedUserId ?? null,
      expectedCompletionDate: body.data.expectedCompletionDate,
      originalExpectedCompletionDate: body.data.expectedCompletionDate,
    },
  });
  res.status(201).json(task);
});

tasksRouter.delete("/:id", requireAuth, async (req, res) => {
  await prisma.task.delete({ where: { id: req.params.id } });
  res.status(204).send();
});
