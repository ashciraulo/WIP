import { useState } from "react";

/**
 * The primary "update your progress" control. Drags update local state
 * instantly for a responsive feel; the API call only fires on release
 * (onCommit), so dragging around doesn't spam the network — this is meant
 * to take one gesture and be done.
 */
export function CompletionSlider({
  value,
  onCommit,
  disabled,
}: {
  value: number;
  onCommit: (percent: number) => void;
  disabled?: boolean;
}) {
  const [local, setLocal] = useState(value);
  const [dragging, setDragging] = useState(false);

  const shown = dragging ? local : value;

  return (
    <div className="flex items-center gap-2">
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={shown}
        disabled={disabled}
        onChange={(e) => {
          setDragging(true);
          setLocal(Number(e.target.value));
        }}
        onMouseUp={(e) => {
          setDragging(false);
          onCommit(Number((e.target as HTMLInputElement).value));
        }}
        onTouchEnd={(e) => {
          setDragging(false);
          onCommit(Number((e.target as HTMLInputElement).value));
        }}
        className="h-2 w-full cursor-pointer accent-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
      />
      <span className="w-10 shrink-0 text-right text-sm font-medium tabular-nums">{shown}%</span>
    </div>
  );
}
