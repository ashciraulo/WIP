import { useEffect, useState } from "react";
import { api } from "../api/client";
import { ManagerStaffRow } from "../types";
import { RiskBadge } from "../components/RiskBadge";
import { JobModal } from "../components/JobModal";

export function ManagerDashboard() {
  const [rows, setRows] = useState<ManagerStaffRow[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [openJobId, setOpenJobId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .dashboardManager()
      .then(setRows)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-sm text-slate-400">Loading...</div>;

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="text-xl font-semibold text-slate-900">Team Workload</h1>
      <p className="mt-1 text-sm text-slate-500">
        A quick read on who's carrying what — heavy open-task counts or a lot of red/amber may mean someone needs support or a
        rebalance.
      </p>

      <div className="mt-6 space-y-3">
        {rows.map((row) => {
          const busy = row.overdueCount + row.atRiskCount;
          return (
            <div key={row.staff.id} className="rounded-lg border border-slate-200 bg-white shadow-sm">
              <button
                onClick={() => setExpanded(expanded === row.staff.id ? null : row.staff.id)}
                className="flex w-full items-center justify-between p-4 text-left"
              >
                <div>
                  <div className="font-medium text-slate-900">{row.staff.name}</div>
                  <div className="text-xs text-slate-500">{row.staff.email}</div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-slate-600">{row.openTaskCount} open</span>
                  {row.overdueCount > 0 && <span className="font-medium text-red-600">{row.overdueCount} overdue</span>}
                  {row.atRiskCount > 0 && <span className="font-medium text-amber-600">{row.atRiskCount} at risk</span>}
                  {busy === 0 && row.openTaskCount > 0 && <span className="font-medium text-green-600">on track</span>}
                  <span className="text-slate-300">{expanded === row.staff.id ? "▲" : "▼"}</span>
                </div>
              </button>

              {expanded === row.staff.id && (
                <div className="border-t border-slate-100 p-4">
                  {row.tasks.length === 0 ? (
                    <p className="text-sm text-slate-400">No open tasks.</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                          <th className="pb-2">Job</th>
                          <th className="pb-2">Task</th>
                          <th className="pb-2">Progress</th>
                          <th className="pb-2">Expected</th>
                          <th className="pb-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {row.tasks.map((t) => (
                          <tr key={t.id} className="border-t border-slate-50">
                            <td className="py-2">
                              <button onClick={() => setOpenJobId(t.job.id)} className="text-slate-700 hover:underline">
                                {t.job.jobNumber}
                              </button>
                            </td>
                            <td className="py-2">{t.name}</td>
                            <td className="py-2 tabular-nums">{t.completionPercent}%</td>
                            <td className="py-2">{t.expectedCompletionDate ? new Date(t.expectedCompletionDate).toLocaleDateString() : "—"}</td>
                            <td className="py-2">
                              <RiskBadge level={t.risk} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {rows.length === 0 && <p className="text-sm text-slate-400">No direct reports found for this account.</p>}
      </div>

      {openJobId && <JobModal jobId={openJobId} onClose={() => setOpenJobId(null)} />}
    </div>
  );
}
