import { prisma } from "../lib/prisma";

/**
 * Called whenever a task's status changes. Keeps IdleGap rows in sync so we
 * can report how long jobs sit with nobody actively working them:
 *
 *  - A task completing opens a gap on the job, unless the next task in
 *    sequence is already in progress.
 *  - A task starting closes any open gap on its job (it's the thing the job
 *    was waiting on).
 *
 * This runs as plain follow-up queries rather than inside the caller's
 * transaction, since a missed idle-gap edge case shouldn't block the status
 * update itself from succeeding.
 */
export async function syncIdleGapsForTaskChange(taskId: string) {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return;

  if (task.status === "COMPLETE") {
    const nextTask = await prisma.task.findFirst({
      where: { jobId: task.jobId, sequence: task.sequence + 1 },
    });

    if (!nextTask || nextTask.status === "NOT_STARTED" || nextTask.status === "ON_HOLD") {
      const alreadyOpen = await prisma.idleGap.findFirst({
        where: { jobId: task.jobId, idleEnd: null },
      });
      if (!alreadyOpen) {
        await prisma.idleGap.create({
          data: {
            jobId: task.jobId,
            fromTaskId: task.id,
            toTaskId: nextTask?.id ?? null,
            idleStart: task.completedAt ?? new Date(),
          },
        });
      }
    }
  }

  if (task.status === "IN_PROGRESS") {
    const openGap = await prisma.idleGap.findFirst({
      where: { jobId: task.jobId, idleEnd: null },
    });
    if (openGap) {
      const idleEnd = task.startedAt ?? new Date();
      const durationMins = Math.max(0, Math.round((idleEnd.getTime() - openGap.idleStart.getTime()) / 60000));
      await prisma.idleGap.update({
        where: { id: openGap.id },
        data: { idleEnd, durationMins, toTaskId: openGap.toTaskId ?? task.id },
      });
    }
  }
}
