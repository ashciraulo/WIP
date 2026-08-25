import { MyTask } from "../types";
import { CompletionSlider } from "./CompletionSlider";
import { RiskBadge } from "./RiskBadge";

export function TaskCard({
  task,
  onPercentChange,
  onComplete,
  onOpenJob,
}: {
  task: MyTask;
  onPercentChange: (percent: number) => void;
  onComplete: () => void;
  onOpenJob: () => void;
}) {
  const due = task.expectedCompletionDate ? new Date(task.expectedCompletionDate).toLocaleDateString() : "No date set";

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <button onClick={onOpenJob} className="text-left text-sm font-medium text-slate-900 hover:underline">
            {task.job.jobNumber} · {task.job.name}
          </button>
          <div className="text-sm text-slate-600">{task.name}</div>
        </div>
        <RiskBadge level={task.risk.level} />
      </div>

      <div className="mt-3">
        <CompletionSlider value={task.completionPercent} onCommit={onPercentChange} />
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
        <button onClick={onOpenJob} className="hover:underline">
          Expected: {due}
        </button>
        <button
          onClick={onComplete}
          className="rounded bg-slate-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-slate-700"
        >
          Mark complete
        </button>
      </div>
    </div>
  );
}
