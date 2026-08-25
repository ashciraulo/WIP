import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { assessTaskRisk } from "../services/scheduleRisk";

export const dashboardRouter = Router();

/**
 * The personal dashboard: what's on my plate right now, plus a heads-up on
 * jobs where I'm not yet involved but will be as soon as whoever has the
 * current task finishes. The "handover" date is simply that person's own
 * expected completion date for their task — we don't try to be smarter
 * than the estimate they gave.
 */
dashboardRouter.get("/me", requireAuth, async (req, res) => {
  const userId = req.user!.id;

  const myTasks = await prisma.task.findMany({
    where: { assignedUserId: userId, status: { not: "COMPLETE" } },
    include: { job: { select: { id: true, jobNumber: true, name: true, dueDate: true } } },
    orderBy: [{ expectedCompletionDate: "asc" }],
  });

  const myTasksShaped = myTasks.map((t) => ({ ...t, risk: assessTaskRisk(t) }));

  // Jobs with an active task not assigned to me, but whose *next* task in
  // sequence is mine — these are the "heads up, this is coming to you" rows.
  const activeJobs = await prisma.job.findMany({
    where: { status: "ACTIVE" },
    include: { tasks: { orderBy: { sequence: "asc" }, include: { assignedUser: { select: { id: true, name: true } } } } },
  });

  const upcomingHandovers = [];
  for (const job of activeJobs) {
    const current = job.tasks.find((t) => t.status !== "COMPLETE");
    if (!current || current.assignedUserId === userId) continue;
    const next = job.tasks.find((t) => t.sequence === current.sequence + 1);
    if (next && next.assignedUserId === userId) {
      upcomingHandovers.push({
        job: { id: job.id, jobNumber: job.jobNumber, name: job.name },
        currentTask: { id: current.id, name: current.name, assignedUser: current.assignedUser, completionPercent: current.completionPercent },
        myNextTask: { id: next.id, name: next.name },
        expectedHandoverDate: current.expectedCompletionDate,
        risk: assessTaskRisk(current).level,
      });
    }
  }

  res.json({ myTasks: myTasksShaped, upcomingHandovers });
});

/**
 * Manager rollup: one row per direct report, each carrying their open task
 * count and how many of those are at-risk/overdue, so a manager can spot a
 * struggling team member (too much red) or an imbalance (one person with 9
 * open tasks, another with 1) at a glance without reading every task.
 */
dashboardRouter.get("/manager", requireAuth, async (req, res) => {
  const staff = await prisma.user.findMany({
    where: { managerId: req.user!.id, active: true },
    select: { id: true, name: true, email: true },
  });

  const result = await Promise.all(
    staff.map(async (person) => {
      const tasks = await prisma.task.findMany({
        where: { assignedUserId: person.id, status: { not: "COMPLETE" } },
        include: { job: { select: { id: true, jobNumber: true, name: true } } },
      });
      const withRisk = tasks.map((t) => ({ ...t, risk: assessTaskRisk(t).level }));
      return {
        staff: person,
        openTaskCount: tasks.length,
        overdueCount: withRisk.filter((t) => t.risk === "OVERDUE").length,
        atRiskCount: withRisk.filter((t) => t.risk === "AT_RISK").length,
        tasks: withRisk,
      };
    })
  );

  res.json(result);
});
