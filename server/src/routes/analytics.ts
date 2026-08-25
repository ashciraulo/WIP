import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

export const analyticsRouter = Router();

/** Why do expected dates keep moving? Breakdown by reason, and by who's logging them. */
analyticsRouter.get("/due-date-reasons", requireAuth, async (req, res) => {
  const days = Number(req.query.days ?? 90);
  const since = new Date(Date.now() - days * 86_400_000);

  const changes = await prisma.dueDateChangeLog.findMany({
    where: { changedAt: { gte: since } },
    include: { user: { select: { id: true, name: true } }, task: { select: { jobId: true, name: true } } },
  });

  const byReason: Record<string, number> = {};
  for (const c of changes) byReason[c.reason] = (byReason[c.reason] ?? 0) + 1;

  const byUser: Record<string, { name: string; count: number }> = {};
  for (const c of changes) {
    const key = c.user.id;
    byUser[key] ??= { name: c.user.name, count: 0 };
    byUser[key].count += 1;
  }

  // Push-outs vs pull-ins: are dates mostly slipping later, or getting corrected earlier?
  let pushedOut = 0;
  let pulledIn = 0;
  for (const c of changes) {
    if (!c.oldDate) continue;
    if (new Date(c.newDate) > new Date(c.oldDate)) pushedOut += 1;
    else if (new Date(c.newDate) < new Date(c.oldDate)) pulledIn += 1;
  }

  res.json({
    windowDays: days,
    totalChanges: changes.length,
    byReason,
    byUser: Object.values(byUser).sort((a, b) => b.count - a.count),
    pushedOut,
    pulledIn,
    recent: changes
      .sort((a, b) => b.changedAt.getTime() - a.changedAt.getTime())
      .slice(0, 25)
      .map((c) => ({
        taskName: c.task.name,
        user: c.user.name,
        reason: c.reason,
        oldDate: c.oldDate,
        newDate: c.newDate,
        note: c.note,
        changedAt: c.changedAt,
      })),
  });
});

/** How long are jobs sitting idle between task handoffs? */
analyticsRouter.get("/idle-time", requireAuth, async (req, res) => {
  const days = Number(req.query.days ?? 90);
  const since = new Date(Date.now() - days * 86_400_000);

  const gaps = await prisma.idleGap.findMany({
    where: { idleStart: { gte: since } },
    include: {
      job: { select: { id: true, jobNumber: true, name: true } },
      fromTask: { select: { name: true } },
      toTask: { select: { name: true } },
    },
    orderBy: { idleStart: "desc" },
  });

  const closed = gaps.filter((g) => g.durationMins != null);
  const totalMins = closed.reduce((sum, g) => sum + (g.durationMins ?? 0), 0);
  const avgMins = closed.length ? Math.round(totalMins / closed.length) : 0;

  res.json({
    windowDays: days,
    gapCount: gaps.length,
    openGapCount: gaps.filter((g) => g.durationMins == null).length,
    avgIdleMinutes: avgMins,
    totalIdleMinutes: totalMins,
    gaps: gaps.map((g) => ({
      job: g.job,
      fromTask: g.fromTask?.name ?? null,
      toTask: g.toTask?.name ?? null,
      idleStart: g.idleStart,
      idleEnd: g.idleEnd,
      durationMins: g.durationMins,
    })),
  });
});
