import { RiskLevel } from "../types";

const STYLES: Record<RiskLevel, { label: string; className: string }> = {
  ON_TRACK: { label: "On track", className: "bg-green-100 text-green-800" },
  AT_RISK: { label: "At risk", className: "bg-amber-100 text-amber-800" },
  OVERDUE: { label: "Overdue", className: "bg-red-100 text-red-800" },
  UNKNOWN: { label: "No date set", className: "bg-slate-100 text-slate-600" },
};

export function RiskBadge({ level }: { level: RiskLevel }) {
  const style = STYLES[level] ?? STYLES.UNKNOWN;
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${style.className}`}>{style.label}</span>;
}

/** Small dot form for dense rows, e.g. the WIP meeting table. */
export function RiskDot({ level }: { level: RiskLevel }) {
  const color = { ON_TRACK: "bg-green-500", AT_RISK: "bg-amber-500", OVERDUE: "bg-red-500", UNKNOWN: "bg-slate-300" }[level];
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${color}`} title={STYLES[level]?.label} />;
}
