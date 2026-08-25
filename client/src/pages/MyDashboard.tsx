import { useEffect, useState } from "react";
import { api } from "../api/client";
import { MyTask, UpcomingHandover } from "../types";
import { TaskCard } from "../components/TaskCard";
import { RiskBadge } from "../components/RiskBadge";
import { JobModal } from "../components/JobModal";
import { useAuth } from "../hooks/useAuth";

export function MyDashboard() {
  const { user } = useAuth();
  const [myTasks, setMyTasks] = useState<MyTask[]>([]);
  const [handovers, setHandovers] = useState<UpcomingHandover[]>([]);
  const [openJobId, setOpenJobId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  function load() {
    api
      .dashboardMe()
      .then((res) => {
        setMyTasks(res.myTasks);
        setHandovers(res.upcomingHandovers);
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  const overdue = myTasks.filter((t) => t.risk.level === "OVERDUE").length;
  const atRisk = myTasks.filter((t) => t.risk.level === "AT_RISK").length;

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <h1 className="text-xl font-semibold text-slate-900">Hi {user?.name?.split(" ")[0]} 👋</h1>
      <p className="mt-1 text-sm text-slate-500">
        {myTasks.length} open task{myTasks.length === 1 ? "" : "s"}
        {overdue > 0 && <span className="text-red-600"> · {overdue} overdue</span>}
        {atRisk > 0 && <span className="text-amber-600"> · {atRisk} at risk</span>}
      </p>

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">My Actions</h2>
        {loading ? (
          <p className="text-sm text-slate-400">Loading...</p>
        ) : myTasks.length === 0 ? (
          <p className="text-sm text-slate-400">Nothing on your plate right now.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {myTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onPercentChange={async (percent) => {
                  await api.updatePercent(task.id, percent);
                  load();
                }}
                onComplete={async () => {
                  await api.completeTask(task.id);
                  load();
                }}
                onOpenJob={() => setOpenJobId(task.jobId)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Coming To You Next</h2>
        {handovers.length === 0 ? (
          <p className="text-sm text-slate-400">No jobs are queued up behind someone else's task right now.</p>
        ) : (
          <div className="space-y-2">
            {handovers.map((h) => (
              <button
                key={h.job.id}
                onClick={() => setOpenJobId(h.job.id)}
                className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white p-3 text-left shadow-sm hover:border-slate-300"
              >
                <div>
                  <div className="text-sm font-medium text-slate-900">
                    {h.job.jobNumber} · {h.job.name}
                  </div>
                  <div className="text-xs text-slate-500">
                    Currently with {h.currentTask.assignedUser?.name ?? "unassigned"} — {h.currentTask.name} (
                    {h.currentTask.completionPercent}%)
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-400">Expected handover</div>
                  <div className="text-sm font-medium">
                    {h.expectedHandoverDate ? new Date(h.expectedHandoverDate).toLocaleDateString() : "TBD"}
                  </div>
                  <RiskBadge level={h.risk} />
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {openJobId && (
        <JobModal
          jobId={openJobId}
          onClose={() => {
            setOpenJobId(null);
            load();
          }}
        />
      )}
    </div>
  );
}
