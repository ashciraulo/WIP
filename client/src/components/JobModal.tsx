import { useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import { DELAY_REASON_LABELS, DelayReason, JobDetail, TaskDetail, User } from "../types";
import { RiskBadge } from "./RiskBadge";
import { CompletionSlider } from "./CompletionSlider";

interface PendingDateEdit {
  taskId: string;
  date: string;
  reason: DelayReason | "";
  note: string;
}

export function JobModal({ jobId, onClose }: { jobId: string; onClose: () => void }) {
  const [job, setJob] = useState<JobDetail | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingDateEdit | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.job(jobId).then(setJob);
    api.users().then(setUsers);
  }, [jobId]);

  function refresh() {
    api.job(jobId).then(setJob);
  }

  async function flushPending() {
    if (pending && pending.reason) {
      await api.changeDueDate(pending.taskId, { newDate: pending.date, reason: pending.reason, note: pending.note || undefined });
    }
    setPending(null);
    setEditingTaskId(null);
  }

  async function handleClose() {
    await flushPending();
    onClose();
  }

  function startEditingDate(task: TaskDetail) {
    setEditingTaskId(task.id);
    setPending({
      taskId: task.id,
      date: task.expectedCompletionDate ? task.expectedCompletionDate.slice(0, 10) : "",
      reason: "",
      note: "",
    });
  }

  async function saveDateEdit() {
    if (!pending || !pending.reason || !pending.date) return;
    await api.changeDueDate(pending.taskId, { newDate: pending.date, reason: pending.reason, note: pending.note || undefined });
    setPending(null);
    setEditingTaskId(null);
    refresh();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-12"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div ref={panelRef} className="w-full max-w-2xl rounded-xl bg-white shadow-xl">
        {!job ? (
          <div className="p-8 text-center text-slate-500">Loading...</div>
        ) : (
          <>
            <div className="flex items-start justify-between border-b border-slate-200 p-5">
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Job {job.jobNumber}</div>
                <h2 className="text-lg font-semibold text-slate-900">{job.name}</h2>
                {job.client && <div className="text-sm text-slate-500">{job.client}</div>}
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-400">Due date</div>
                <div className="text-sm font-medium">{job.dueDate ? new Date(job.dueDate).toLocaleDateString() : "—"}</div>
                <button onClick={handleClose} className="mt-2 text-xs text-slate-400 hover:text-slate-700">
                  Close ✕
                </button>
              </div>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-5">
              <div className="space-y-3">
                {job.tasks.map((task) => (
                  <div key={task.id} className="rounded-lg border border-slate-200 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs text-slate-400">Task {task.sequence}</div>
                        <div className="font-medium text-slate-900">{task.name}</div>
                        <div className="text-sm text-slate-500">
                          {task.assignedUser ? task.assignedUser.name : <span className="italic">Unassigned</span>}
                        </div>
                      </div>
                      <RiskBadge level={task.risk.level} />
                    </div>

                    <div className="mt-2">
                      <CompletionSlider
                        value={task.completionPercent}
                        disabled={task.status === "COMPLETE"}
                        onCommit={async (percent) => {
                          await api.updatePercent(task.id, percent);
                          refresh();
                        }}
                      />
                    </div>

                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                      <div className="text-slate-500">
                        Status: <span className="font-medium text-slate-700">{task.status.replace("_", " ")}</span>
                        {task.status !== "COMPLETE" && (
                          <button
                            onClick={async () => {
                              await api.completeTask(task.id);
                              refresh();
                            }}
                            className="ml-2 rounded bg-slate-900 px-2 py-0.5 text-xs text-white hover:bg-slate-700"
                          >
                            Mark complete
                          </button>
                        )}
                        {task.status === "COMPLETE" && (
                          <button
                            onClick={async () => {
                              await api.reopenTask(task.id);
                              refresh();
                            }}
                            className="ml-2 rounded border border-slate-300 px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-50"
                          >
                            Reopen
                          </button>
                        )}
                      </div>

                      <button onClick={() => startEditingDate(task)} className="text-slate-500 hover:text-slate-900 hover:underline">
                        Expected:{" "}
                        <span className="font-medium">
                          {task.expectedCompletionDate ? new Date(task.expectedCompletionDate).toLocaleDateString() : "Set date"}
                        </span>
                      </button>
                    </div>

                    {editingTaskId === task.id && pending && (
                      <div className="mt-3 space-y-2 rounded-md bg-slate-50 p-3">
                        <div className="flex gap-2">
                          <input
                            type="date"
                            value={pending.date}
                            onChange={(e) => setPending({ ...pending, date: e.target.value })}
                            className="rounded border border-slate-300 px-2 py-1 text-sm"
                          />
                          <select
                            value={pending.reason}
                            onChange={(e) => setPending({ ...pending, reason: e.target.value as DelayReason })}
                            className="flex-1 rounded border border-slate-300 px-2 py-1 text-sm"
                          >
                            <option value="">Reason for change...</option>
                            {Object.entries(DELAY_REASON_LABELS).map(([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <input
                          type="text"
                          placeholder="Optional note"
                          value={pending.note}
                          onChange={(e) => setPending({ ...pending, note: e.target.value })}
                          className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => {
                              setPending(null);
                              setEditingTaskId(null);
                            }}
                            className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={saveDateEdit}
                            disabled={!pending.reason || !pending.date}
                            className="rounded bg-slate-900 px-3 py-1 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-40"
                          >
                            Save
                          </button>
                        </div>
                        {task.dueDateChanges.length > 0 && (
                          <div className="border-t border-slate-200 pt-2 text-xs text-slate-500">
                            Last changed {new Date(task.dueDateChanges[0].changedAt).toLocaleDateString()} by{" "}
                            {task.dueDateChanges[0].user.name} — {DELAY_REASON_LABELS[task.dueDateChanges[0].reason]}
                          </div>
                        )}
                      </div>
                    )}

                    <AssigneeControl task={task} users={users} onChanged={refresh} />
                  </div>
                ))}
                {job.tasks.length === 0 && <div className="text-center text-sm text-slate-400">No task lines yet.</div>}
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 p-4">
              <button onClick={handleClose} className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
                Save & close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function AssigneeControl({ task, users, onChanged }: { task: TaskDetail; users: User[]; onChanged: () => void }) {
  return (
    <div className="mt-2 text-xs text-slate-400">
      Reassign:{" "}
      <select
        defaultValue={task.assignedUserId ?? ""}
        onChange={async (e) => {
          await api.assignTask(task.id, e.target.value || null);
          onChanged();
        }}
        className="rounded border border-slate-200 px-1 py-0.5 text-xs text-slate-600"
      >
        <option value="">Unassigned</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
          </option>
        ))}
      </select>
    </div>
  );
}
