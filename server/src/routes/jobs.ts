import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { assessTaskRisk } from "../services/scheduleRisk";

export const jobsRouter = Router();

function currentTaskOf<T extends { status: string }>(tasks: T[]): T | null {
  return tasks.find((t) => t.status !== "COMPLETE") ?? tasks[tasks.length - 1] ?? null;
}

/**
 * Job list for the WIP meeting dashboard: every active job, ordered by due
 * date, each annotated with its current task + assignee and a risk level
 * derived from that task so "who's the next task with, and are we in
 * trouble" is answerable without opening anything.
 */
jobsRouter.get("/", requireAuth, async (req, res) => {
  const status = typeof req.query.status === "string" ? req.query.status : "ACTIVE";

  const jobs = await prisma.job.findMany({
    where: status === "ALL" ? {} : { status },
    orderBy: { dueDate: "asc" },
    include: {
      tasks: {
        orderBy: { sequence: "asc" },
        include: { assignedUser: { select: { id: true, name: true } } },
      },
    },
  });

  const shaped = jobs.map((job) => {
    const current = currentTaskOf(job.tasks);
    const risk = current ? assessTaskRisk(current) : { level: "UNKNOWN" as const, projectedCompletionDate: null, reason: "No task lines yet." };
    const daysToDue = job.dueDate ? Math.ceil((new Date(job.dueDate).getTime() - Date.now()) / 86_400_000) : null;
    return {
      id: job.id,
      jobNumber: job.jobNumber,
      name: job.name,
      client: job.client,
      dueDate: job.dueDate,
      status: job.status,
      daysToDue,
      taskCount: job.tasks.length,
      completedTaskCount: job.tasks.filter((t) => t.status === "COMPLETE").length,
      currentTask: current
        ? {
            id: current.id,
            name: current.name,
            assignedUser: current.assignedUser,
            completionPercent: current.completionPercent,
            expectedCompletionDate: current.expectedCompletionDate,
          }
        : null,
      risk: risk.level,
    };
  });

  res.json(shaped);
});

/** Full job detail for the job modal: every task line, assignee, and due-date history. */
jobsRouter.get("/:id", requireAuth, async (req, res) => {
  const job = await prisma.job.findUnique({
    where: { id: req.params.id },
    include: {
      tasks: {
        orderBy: { sequence: "asc" },
        include: {
          assignedUser: { select: { id: true, name: true } },
          dueDateChanges: { orderBy: { changedAt: "desc" }, include: { user: { select: { id: true, name: true } } } },
        },
      },
    },
  });
  if (!job) return res.status(404).json({ error: "Job not found" });

  const tasksWithRisk = job.tasks.map((t) => ({ ...t, risk: assessTaskRisk(t) }));

  res.json({ ...job, tasks: tasksWithRisk });
});

jobsRouter.post("/", requireAuth, async (req, res) => {
  const body = z
    .object({
      jobNumber: z.string().min(1),
      name: z.string().min(1),
      client: z.string().optional(),
      dueDate: z.coerce.date().optional(),
    })
    .safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "jobNumber and name are required" });

  const job = await prisma.job.create({ data: body.data });
  res.status(201).json(job);
});

jobsRouter.patch("/:id", requireAuth, async (req, res) => {
  const body = z
    .object({
      name: z.string().min(1).optional(),
      client: z.string().optional(),
      dueDate: z.coerce.date().nullable().optional(),
      status: z.enum(["ACTIVE", "ON_HOLD", "COMPLETE", "CANCELLED"]).optional(),
    })
    .safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "Invalid job update" });

  const job = await prisma.job.update({ where: { id: req.params.id }, data: body.data });
  res.json(job);
});
