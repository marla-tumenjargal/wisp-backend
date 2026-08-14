"use client";

import { useState } from "react";
import type { RankedRecommendation } from "@/lib/recsys/types";
import { visualFor } from "@/lib/recsys/visuals";

type RecommendationCardProps = {
  item: RankedRecommendation;
  saved: boolean;
  inProject: boolean;
  projectName: string | null;
  busy?: boolean;
  onSave: () => void;
  onAddToProject: () => void;
  onDismiss: () => void;
  onOpen: () => void;
};

export function RecommendationCard({
  item,
  saved,
  inProject,
  projectName,
  busy,
  onSave,
  onAddToProject,
  onDismiss,
  onOpen,
}: RecommendationCardProps) {
  const [whyOpen, setWhyOpen] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const { candidate, explanation } = item;
  const visual = visualFor(candidate.visualKey);
  const showImage = Boolean(candidate.imageUrl) && !imgFailed;

  return (
    <article className="group mb-5 flex break-inside-avoid flex-col overflow-hidden rounded-md border border-ink/10 bg-white/70 transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-ink/20 hover:shadow-[0_12px_40px_rgba(12,12,12,0.06)]">
      <button
        type="button"
        onClick={onOpen}
        className="relative block aspect-[4/3] w-full overflow-hidden text-left"
        aria-label={`Open ${candidate.title}`}
      >
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={candidate.imageUrl ?? ""}
            alt=""
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center font-[family-name:var(--font-display)] text-4xl"
            style={visual.style}
            aria-hidden
          >
            {visual.mark}
          </div>
        )}
        <span className="absolute left-3 top-3 rounded-sm bg-paper/90 px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-[0.1em] text-ink/70">
          {candidate.medium}
        </span>
      </button>

      <div className="flex flex-1 flex-col px-4 py-4">
        <p className="text-[0.65rem] font-medium uppercase tracking-[0.12em] text-ink/40">
          {candidate.category}
          <span className="mx-1.5 text-ink/20">·</span>
          {candidate.sourceName}
        </p>
        <h3 className="mt-1.5 font-[family-name:var(--font-display)] text-lg font-semibold leading-snug tracking-[-0.02em] text-ink">
          {candidate.title}
        </h3>
        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink/60">
          {candidate.description}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onSave}
            aria-pressed={saved}
            className={[
              "inline-flex h-8 items-center rounded-md px-2.5 text-sm transition-[background-color,color,transform] duration-150 active:scale-[0.97] disabled:opacity-40",
              saved
                ? "bg-klein text-white"
                : "border border-ink/12 text-ink/70 hover:border-ink/25 hover:text-ink",
            ].join(" ")}
          >
            {saved ? "Saved" : "Save"}
          </button>
          <button
            type="button"
            disabled={busy || !projectName}
            onClick={onAddToProject}
            className={[
              "inline-flex h-8 items-center rounded-md px-2.5 text-sm transition-colors disabled:opacity-40",
              inProject
                ? "text-klein"
                : "text-ink/55 hover:text-ink",
            ].join(" ")}
          >
            {inProject ? "In project" : "+ Add to project"}
          </button>
          <a
            href={candidate.sourceUrl}
            target="_blank"
            rel="noreferrer"
            onClick={onOpen}
            className="inline-flex h-8 items-center text-sm text-ink/45 hover:text-ink"
          >
            Open source
          </a>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setWhyOpen((v) => !v)}
            aria-expanded={whyOpen}
            className="text-[0.7rem] uppercase tracking-[0.1em] text-ink/35 hover:text-ink/70"
          >
            Why this?
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onDismiss}
            className="text-[0.7rem] uppercase tracking-[0.1em] text-ink/25 hover:text-ink/50"
          >
            Dismiss
          </button>
        </div>

        {whyOpen ? (
          <div className="mt-3 border-t border-ink/8 pt-3 text-sm leading-relaxed text-ink/65">
            <p>{explanation.summary}</p>
            {explanation.matchedPreferences.length > 0 ? (
              <ul className="mt-2 space-y-0.5 text-ink/50">
                {explanation.matchedPreferences.map((p) => (
                  <li key={p}>You selected {p}</li>
                ))}
              </ul>
            ) : null}
            {explanation.projectName ? (
              <p className="mt-2 text-ink/50">
                Your project: {explanation.projectName}
              </p>
            ) : null}
            {explanation.sharedConcepts.length > 0 ? (
              <p className="mt-1 text-ink/45">
                Shares:{" "}
                {explanation.sharedConcepts
                  .map((c) => c.replace(/-/g, " "))
                  .join(", ")}
              </p>
            ) : null}
            {explanation.mediumShift ? (
              <p className="mt-1 text-klein">
                {explanation.mediumShift.from} → {explanation.mediumShift.to}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}
