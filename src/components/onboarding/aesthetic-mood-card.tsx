"use client";

import type { Aesthetic } from "@/lib/onboarding/catalog";
import { AESTHETIC_VISUALS } from "@/lib/onboarding/catalog";

type AestheticMoodCardProps = {
  aesthetic: Aesthetic;
  selected: boolean;
  onToggle: () => void;
};

export function AestheticMoodCard({
  aesthetic,
  selected,
  onToggle,
}: AestheticMoodCardProps) {
  const visual = AESTHETIC_VISUALS[aesthetic];

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onToggle}
      className={[
        "group flex flex-col overflow-hidden rounded-md border text-left transition-[border-color,transform,box-shadow] duration-200 active:scale-[0.98]",
        selected
          ? "border-klein shadow-[0_0_0_1px_var(--klein)]"
          : "border-ink/12 hover:border-ink/25",
      ].join(" ")}
    >
      <div
        className="flex h-20 items-center justify-center text-2xl sm:h-24"
        style={visual.style}
        aria-hidden
      >
        {aesthetic === "Monochrome" ? (
          <span className="flex h-full w-full">
            <span className="flex flex-1 items-center justify-center bg-ink text-paper">
              ▮
            </span>
            <span className="flex flex-1 items-center justify-center bg-paper text-ink">
              ▯
            </span>
          </span>
        ) : (
          visual.label
        )}
      </div>
      <div
        className={[
          "border-t px-3 py-2.5 text-sm tracking-wide transition-colors",
          selected
            ? "border-klein/20 bg-klein text-white"
            : "border-ink/8 bg-white/80 text-ink/80 group-hover:bg-white",
        ].join(" ")}
      >
        {aesthetic}
      </div>
    </button>
  );
}
