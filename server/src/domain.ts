// Enum-shaped string values used throughout the schema. Kept as plain
// TS unions (not Prisma enums) because the SQLite connector used for local
// dev doesn't support native enums — see the comment at the top of
// prisma/schema.prisma. Validate against these lists at the API boundary
// (routes already do this via zod) rather than relying on the database to
// reject bad values.

export const ROLES = ["STAFF", "MANAGER", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

export const JOB_STATUSES = ["ACTIVE", "ON_HOLD", "COMPLETE", "CANCELLED"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const TASK_STATUSES = ["NOT_STARTED", "IN_PROGRESS", "COMPLETE", "ON_HOLD"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const DELAY_REASONS = [
  "MATERIAL_DELAY",
  "STAFF_ABSENCE",
  "REWORK",
  "CLIENT_DELAY",
  "SCOPE_CHANGE",
  "WAITING_ON_THIRD_PARTY",
  "OTHER",
] as const;
export type DelayReason = (typeof DELAY_REASONS)[number];

export const TASK_EVENT_TYPES = [
  "ASSIGNED",
  "STATUS_CHANGED",
  "PERCENT_UPDATED",
  "DUE_DATE_CHANGED",
  "STARTED",
  "COMPLETED",
  "HANDED_OFF",
] as const;
export type TaskEventType = (typeof TASK_EVENT_TYPES)[number];
