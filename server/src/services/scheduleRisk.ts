import { Task } from "@prisma/client";

export type RiskLevel = "ON_TRACK" | "AT_RISK" | "OVERDUE" | "UNKNOWN";

export interface RiskAssessment {
  level: RiskLevel;
  /** Best-guess finish date if current pace continues; null when we don't have enough data. */
  projectedCompletionDate: Date | null;
  /** Human-readable reason, useful in tooltips. */
  reason: string;
}

const AT_RISK_BUFFER_DAYS = 1; // projected finish within this many days of the deadline still counts as at-risk, not on-track

/**
 * Flags a task as on-track / at-risk / overdue purely from data already on
 * the record — no extra input from the user. Two signals feed it:
 *  1. Overdue: today is past the expected completion date and the task
 *     isn't done.
 *  2. At-risk: linear-projecting the pace-to-date (percent complete over
 *     elapsed time since the task started) forward suggests it won't reach
 *     100% by the expected date, even though that date hasn't passed yet.
 *
 * This is intentionally simple (straight-line extrapolation, not a fitted
 * curve) so it stays predictable to staff and managers looking at it.
 */
export function assessTaskRisk(task: Pick<Task, "status" | "completionPercent" | "expectedCompletionDate" | "startedAt">): RiskAssessment {
  if (task.status === "COMPLETE") {
    return { level: "ON_TRACK", projectedCompletionDate: null, reason: "Task is complete." };
  }

  if (!task.expectedCompletionDate) {
    return { level: "UNKNOWN", projectedCompletionDate: null, reason: "No expected completion date set." };
  }

  const now = new Date();
  const due = new Date(task.expectedCompletionDate);

  if (now > due) {
    return { level: "OVERDUE", projectedCompletionDate: null, reason: "Past the expected completion date." };
  }

  if (!task.startedAt || task.completionPercent <= 0) {
    // Not started yet and not overdue — nothing to project from.
    return { level: "ON_TRACK", projectedCompletionDate: null, reason: "Not started; deadline not yet reached." };
  }

  const started = new Date(task.startedAt);
  const elapsedMs = now.getTime() - started.getTime();
  const pctDone = Math.min(task.completionPercent, 99) / 100; // clamp so a stale "100%" doesn't divide out to zero remaining time

  if (elapsedMs <= 0 || pctDone <= 0) {
    return { level: "ON_TRACK", projectedCompletionDate: null, reason: "Insufficient progress data to project." };
  }

  const totalProjectedMs = elapsedMs / pctDone;
  const projected = new Date(started.getTime() + totalProjectedMs);

  const bufferMs = AT_RISK_BUFFER_DAYS * 24 * 60 * 60 * 1000;
  if (projected.getTime() > due.getTime() + bufferMs) {
    return {
      level: "AT_RISK",
      projectedCompletionDate: projected,
      reason: `At current pace (${task.completionPercent}% done), projected to finish ${projected.toLocaleDateString()}, after the ${due.toLocaleDateString()} target.`,
    };
  }

  return { level: "ON_TRACK", projectedCompletionDate: projected, reason: "Pace supports hitting the expected date." };
}
