export type Role = "STAFF" | "MANAGER" | "ADMIN";
export type TaskStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETE" | "ON_HOLD";
export type JobStatus = "ACTIVE" | "ON_HOLD" | "COMPLETE" | "CANCELLED";
export type RiskLevel = "ON_TRACK" | "AT_RISK" | "OVERDUE" | "UNKNOWN";
export type DelayReason =
  | "MATERIAL_DELAY"
  | "STAFF_ABSENCE"
  | "REWORK"
  | "CLIENT_DELAY"
  | "SCOPE_CHANGE"
  | "WAITING_ON_THIRD_PARTY"
  | "OTHER";

export const DELAY_REASON_LABELS: Record<DelayReason, string> = {
  MATERIAL_DELAY: "Material delay",
  STAFF_ABSENCE: "Staff absence",
  REWORK: "Rework required",
  CLIENT_DELAY: "Client delay",
  SCOPE_CHANGE: "Scope change",
  WAITING_ON_THIRD_PARTY: "Waiting on third party",
  OTHER: "Other",
};

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  managerId?: string | null;
}

export interface JobListItem {
  id: string;
  jobNumber: string;
  name: string;
  client: string | null;
  dueDate: string | null;
  status: JobStatus;
  daysToDue: number | null;
  taskCount: number;
  completedTaskCount: number;
  currentTask: {
    id: string;
    name: string;
    assignedUser: { id: string; name: string } | null;
    completionPercent: number;
    expectedCompletionDate: string | null;
  } | null;
  risk: RiskLevel;
}

export interface DueDateChange {
  id: string;
  oldDate: string | null;
  newDate: string;
  reason: DelayReason;
  note: string | null;
  changedAt: string;
  user: { id: string; name: string };
}

export interface TaskDetail {
  id: string;
  jobId: string;
  name: string;
  sequence: number;
  status: TaskStatus;
  completionPercent: number;
  assignedUser: { id: string; name: string } | null;
  assignedUserId: string | null;
  expectedCompletionDate: string | null;
  originalExpectedCompletionDate: string | null;
  startedAt: string | null;
  completedAt: string | null;
  dueDateChanges: DueDateChange[];
  risk: { level: RiskLevel; projectedCompletionDate: string | null; reason: string };
}

export interface JobDetail {
  id: string;
  jobNumber: string;
  name: string;
  client: string | null;
  dueDate: string | null;
  status: JobStatus;
  tasks: TaskDetail[];
}

export interface MyTask {
  id: string;
  jobId: string;
  name: string;
  status: TaskStatus;
  completionPercent: number;
  expectedCompletionDate: string | null;
  job: { id: string; jobNumber: string; name: string; dueDate: string | null };
  risk: { level: RiskLevel; projectedCompletionDate: string | null; reason: string };
}

export interface UpcomingHandover {
  job: { id: string; jobNumber: string; name: string };
  currentTask: { id: string; name: string; assignedUser: { id: string; name: string } | null; completionPercent: number };
  myNextTask: { id: string; name: string };
  expectedHandoverDate: string | null;
  risk: RiskLevel;
}

export interface ManagerTaskRow {
  id: string;
  name: string;
  status: TaskStatus;
  completionPercent: number;
  expectedCompletionDate: string | null;
  job: { id: string; jobNumber: string; name: string };
  risk: RiskLevel;
}

export interface ManagerStaffRow {
  staff: { id: string; name: string; email: string };
  openTaskCount: number;
  overdueCount: number;
  atRiskCount: number;
  tasks: ManagerTaskRow[];
}
