"use client";

import type { ReactNode } from "react";

type SelectionCardProps = {
  label: string;
  selected: boolean;
  onToggle: () => void;
  description?: string;
};

export function SelectionCard({
  label,
  selected,
  onToggle,
  description,
}: SelectionCardProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onToggle}
      className={[
        "rounded-md border px-3.5 py-2.5 text-left text-sm tracking-wide transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.98]",
        selected
          ? "border-klein bg-klein text-white"
          : "border-ink/15 bg-white/70 text-ink/80 hover:border-ink/30 hover:bg-white",
      ].join(" ")}
    >
      <span className="font-medium">{label}</span>
      {description ? (
        <span
          className={[
            "mt-1 block text-xs leading-snug",
            selected ? "text-white/75" : "text-ink/50",
          ].join(" ")}
        >
          {description}
        </span>
      ) : null}
    </button>
  );
}

type SelectionGridProps = {
  children: ReactNode;
  label: string;
  columns?: "chips" | "mood";
};

export function SelectionGrid({
  children,
  label,
  columns = "chips",
}: SelectionGridProps) {
  return (
    <div
      className={
        columns === "mood"
          ? "mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4"
          : "mt-8 flex flex-wrap gap-2"
      }
      role="group"
      aria-label={label}
    >
      {children}
    </div>
  );
}
