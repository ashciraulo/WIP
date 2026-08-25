import { useEffect, useState } from "react";
import { api } from "../api/client";
import { JobListItem } from "../types";
import { RiskDot } from "../components/RiskBadge";
import { JobModal } from "../components/JobModal";

/** Border/background treatment purely from days-to-due, independent of task risk — this is
 *  "how close is the deadline", not "are we behind pace" (that's the risk dot). */
function dueUrgencyClasses(daysToDue: number | null) {
  if (daysToDue === null) return "border-l-slate-200";
  if (daysToDue < 0) return "border-l-red-600 bg-red-50/60";
  if (daysToDue <= 3) return "border-l-red-500 bg-red-50/30";
  if (daysToDue <= 7) return "border-l-amber-500 bg-amber-50/30";
  return "border-l-transparent";
}

function dueLabel(daysToDue: number | null) {
  if (daysToDue === null) return "No due date";
  if (daysToDue < 0) return `${Math.abs(daysToDue)}d overdue`;
  if (daysToDue === 0) return "Due today";
  return `${daysToDue}d left`;
}

export function WipMeetingDashboard() {
  const [jobs, setJobs] = useState<JobListItem[]>([]);
  const [openJobId, setOpenJobId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .jobs("ACTIVE")
      .then(setJobs)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="text-xl font-semibold text-slate-900">WIP Meeting</h1>
      <p className="mt-1 text-sm text-slate-500">
        All active jobs, soonest due date first. Left edge flags jobs nearing (amber) or past (red) their due date. Click a job
        for the full task breakdown.
      </p>

      {loading ? (
        <p className="mt-6 text-sm text-slate-400">Loading...</p>
      ) : (
        <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-2">Job</th>
                <th className="px-4 py-2">Due</th>
                <th className="px-4 py-2">Current task</th>
                <th className="px-4 py-2">Assigned to</th>
                <th className="px-4 py-2">Progress</th>
                <th className="px-4 py-2">Task risk</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr
                  key={job.id}
                  onClick={() => setOpenJobId(job.id)}
                  className={`cursor-pointer border-l-4 border-t border-slate-100 hover:bg-slate-50 ${dueUrgencyClasses(job.daysToDue)}`}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">
                      {job.jobNumber} · {job.name}
                    </div>
                    <div className="text-xs text-slate-500">{job.client}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div>{job.dueDate ? new Date(job.dueDate).toLocaleDateString() : "—"}</div>
                    <div className="text-xs font-medium text-slate-500">{dueLabel(job.daysToDue)}</div>
                  </td>
                  <td className="px-4 py-3">{job.currentTask?.name ?? <span className="text-slate-400">All tasks complete</span>}</td>
                  <td className="px-4 py-3">{job.currentTask?.assignedUser?.name ?? <span className="text-slate-400">Unassigned</span>}</td>
                  <td className="px-4 py-3 tabular-nums">
                    {job.completedTaskCount}/{job.taskCount} tasks
                    {job.currentTask && <span className="ml-2 text-slate-400">({job.currentTask.completionPercent}%)</span>}
                  </td>
                  <td className="px-4 py-3">
                    <RiskDot level={job.risk} />
                  </td>
                </tr>
              ))}
              {jobs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    No active jobs.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {openJobId && <JobModal jobId={openJobId} onClose={() => setOpenJobId(null)} />}
    </div>
  );
}
