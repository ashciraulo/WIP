const TOKEN_KEY = "wip_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  login: (email: string) => request<{ token: string; user: import("../types").User }>("/auth/login", { method: "POST", body: JSON.stringify({ email }) }),
  me: () => request<{ user: import("../types").User }>("/auth/me"),
  users: () => request<import("../types").User[]>("/users"),

  jobs: (status = "ACTIVE") => request<import("../types").JobListItem[]>(`/jobs?status=${status}`),
  job: (id: string) => request<import("../types").JobDetail>(`/jobs/${id}`),
  createJob: (data: { jobNumber: string; name: string; client?: string; dueDate?: string }) =>
    request("/jobs", { method: "POST", body: JSON.stringify(data) }),
  updateJob: (id: string, data: Record<string, unknown>) => request(`/jobs/${id}`, { method: "PATCH", body: JSON.stringify(data) }),

  addTask: (data: { jobId: string; name: string; assignedUserId?: string | null; expectedCompletionDate?: string }) =>
    request("/tasks", { method: "POST", body: JSON.stringify(data) }),
  deleteTask: (id: string) => request(`/tasks/${id}`, { method: "DELETE" }),
  updatePercent: (id: string, percent: number) => request(`/tasks/${id}/percent`, { method: "PATCH", body: JSON.stringify({ percent }) }),
  completeTask: (id: string) => request(`/tasks/${id}/complete`, { method: "POST" }),
  reopenTask: (id: string) => request(`/tasks/${id}/reopen`, { method: "POST" }),
  assignTask: (id: string, assignedUserId: string | null) =>
    request(`/tasks/${id}/assign`, { method: "PATCH", body: JSON.stringify({ assignedUserId }) }),
  changeDueDate: (id: string, data: { newDate: string; reason: string; note?: string }) =>
    request(`/tasks/${id}/due-date`, { method: "POST", body: JSON.stringify(data) }),

  dashboardMe: () =>
    request<{ myTasks: import("../types").MyTask[]; upcomingHandovers: import("../types").UpcomingHandover[] }>("/dashboard/me"),
  dashboardManager: () => request<import("../types").ManagerStaffRow[]>("/dashboard/manager"),

  analyticsDueDateReasons: (days = 90) => request(`/analytics/due-date-reasons?days=${days}`),
  analyticsIdleTime: (days = 90) => request(`/analytics/idle-time?days=${days}`),

  importFromBC: () => request("/bc/import-jobs", { method: "POST" }),
};
