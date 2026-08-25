import { useEffect, useState } from "react";
import { api } from "../api/client";
import { DELAY_REASON_LABELS, DelayReason } from "../types";

interface DueDateAnalytics {
  windowDays: number;
  totalChanges: number;
  byReason: Record<string, number>;
  byUser: { name: string; count: number }[];
  pushedOut: number;
  pulledIn: number;
  recent: { taskName: string; user: string; reason: DelayReason; oldDate: string | null; newDate: string; note: string | null; changedAt: string }[];
}

interface IdleAnalytics {
  windowDays: number;
  gapCount: number;
  openGapCount: number;
  avgIdleMinutes: number;
  totalIdleMinutes: number;
  gaps: { job: { jobNumber: string; name: string }; fromTask: string | null; toTask: string | null; idleStart: string; idleEnd: string | null; durationMins: number | null }[];
}

function fmtHours(mins: number) {
  return `${(mins / 60).toFixed(1)}h`;
}

export function Analytics() {
  const [days, setDays] = useState(90);
  const [dueDate, setDueDate] = useState<DueDateAnalytics | null>(null);
  const [idle, setIdle] = useState<IdleAnalytics | null>(null);

  useEffect(() => {
    api.analyticsDueDateReasons(days).then(setDueDate as never);
    api.analyticsIdleTime(days).then(setIdle as never);
  }, [days]);

  const maxReasonCount = dueDate ? Math.max(1, ...Object.values(dueDate.byReason)) : 1;

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Analytics</h1>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="rounded border border-slate-300 px-2 py-1 text-sm">
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
          <option value={365}>Last 12 months</option>
        </select>
      </div>

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Why expected dates are moving</h2>
        {dueDate && (
          <>
            <p className="mt-2 text-sm text-slate-500">
              {dueDate.totalChanges} date change{dueDate.totalChanges === 1 ? "" : "s"} in the last {dueDate.windowDays} days —{" "}
              {dueDate.pushedOut} pushed later, {dueDate.pulledIn} pulled earlier.
            </p>

            <div className="mt-4 space-y-2">
              {Object.entries(dueDate.byReason)
                .sort((a, b) => b[1] - a[1])
                .map(([reason, count]) => (
                  <div key={reason} className="flex items-center gap-3 text-sm">
                    <div className="w-40 shrink-0 text-slate-600">{DELAY_REASON_LABELS[reason as DelayReason] ?? reason}</div>
                    <div className="h-3 flex-1 rounded bg-slate-100">
                      <div className="h-3 rounded bg-slate-700" style={{ width: `${(count / maxReasonCount) * 100}%` }} />
                    </div>
                    <div className="w-6 text-right tabular-nums text-slate-500">{count}</div>
                  </div>
                ))}
              {dueDate.totalChanges === 0 && <p className="text-sm text-slate-400">No due-date changes logged in this window.</p>}
            </div>

            {dueDate.byUser.length > 0 && (
              <div className="mt-5">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">By staff member</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {dueDate.byUser.map((u) => (
                    <span key={u.name} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                      {u.name}: {u.count}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </section>

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Idle time between tasks</h2>
        {idle && (
          <>
            <p className="mt-2 text-sm text-slate-500">
              {idle.gapCount} gap{idle.gapCount === 1 ? "" : "s"} logged ({idle.openGapCount} still open) — average{" "}
              {fmtHours(idle.avgIdleMinutes)}, total {fmtHours(idle.totalIdleMinutes)} of jobs sitting idle.
            </p>
            <table className="mt-4 w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="pb-2">Job</th>
                  <th className="pb-2">Between</th>
                  <th className="pb-2">Idle since</th>
                  <th className="pb-2">Duration</th>
                </tr>
              </thead>
              <tbody>
                {idle.gaps.map((g, i) => (
                  <tr key={i} className="border-t border-slate-50">
                    <td className="py-2">
                      {g.job.jobNumber} · {g.job.name}
                    </td>
                    <td className="py-2 text-slate-500">
                      {g.fromTask ?? "—"} → {g.toTask ?? "next task"}
                    </td>
                    <td className="py-2">{new Date(g.idleStart).toLocaleDateString()}</td>
                    <td className="py-2">{g.durationMins != null ? fmtHours(g.durationMins) : <span className="text-amber-600">ongoing</span>}</td>
                  </tr>
                ))}
                {idle.gaps.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-slate-400">
                      No idle gaps in this window.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </>
        )}
      </section>
    </div>
  );
}
