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
  featured?: boolean;
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
  featured = false,
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
    <article
      className={[
        "group flex h-full flex-col overflow-hidden rounded-lg border border-ink/10 bg-white/80 transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-ink/20 hover:shadow-[0_16px_48px_rgba(12,12,12,0.08)]",
        featured ? "lg:col-span-2 lg:grid lg:grid-cols-2 lg:items-stretch" : "",
      ].join(" ")}
    >
      <button
        type="button"
        onClick={onOpen}
        className={[
          "relative block w-full overflow-hidden text-left",
          featured ? "aspect-[16/11] lg:aspect-auto lg:min-h-[320px]" : "aspect-[5/4]",
        ].join(" ")}
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
            className="flex h-full w-full items-center justify-center font-[family-name:var(--font-display)] text-5xl sm:text-6xl"
            style={visual.style}
            aria-hidden
          >
            {visual.mark}
          </div>
        )}
        <span className="absolute left-4 top-4 rounded-sm bg-paper/95 px-2.5 py-1 text-[0.7rem] font-medium uppercase tracking-[0.12em] text-ink/75">
          {candidate.medium}
        </span>
      </button>

      <div
        className={[
          "flex flex-1 flex-col",
          featured ? "px-6 py-6 sm:px-8 sm:py-8" : "px-5 py-5 sm:px-6 sm:py-6",
        ].join(" ")}
      >
        <p className="text-[0.7rem] font-medium uppercase tracking-[0.14em] text-ink/40">
          {candidate.category}
          <span className="mx-2 text-ink/20">·</span>
          {candidate.sourceName}
        </p>
        <h3
          className={[
            "mt-2 font-[family-name:var(--font-display)] font-semibold leading-snug tracking-[-0.025em] text-ink",
            featured
              ? "text-2xl sm:text-3xl"
              : "text-xl sm:text-[1.35rem]",
          ].join(" ")}
        >
          {candidate.title}
        </h3>
        <p
          className={[
            "mt-3 leading-relaxed text-ink/60",
            featured
              ? "line-clamp-4 text-base sm:text-lg"
              : "line-clamp-3 text-[0.95rem] sm:text-base",
          ].join(" ")}
        >
          {candidate.description}
        </p>

        {candidate.tags.length > 0 ? (
          <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Tags">
            {candidate.tags.slice(0, 4).map((tag) => (
              <li
                key={tag}
                className="rounded-sm border border-ink/8 bg-paper/80 px-2 py-0.5 text-[0.7rem] tracking-wide text-ink/50"
              >
                {tag}
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-auto flex flex-wrap items-center gap-2.5 pt-6">
          <button
            type="button"
            disabled={busy}
            onClick={onSave}
            aria-pressed={saved}
            className={[
              "inline-flex h-10 items-center rounded-md px-4 text-sm font-medium transition-[background-color,color,transform] duration-150 active:scale-[0.97] disabled:opacity-40",
              saved
                ? "bg-klein text-white"
                : "border border-ink/15 text-ink/75 hover:border-ink/30 hover:text-ink",
            ].join(" ")}
          >
            {saved ? "Saved" : "Save"}
          </button>
          <button
            type="button"
            disabled={busy || !projectName}
            onClick={onAddToProject}
            className={[
              "inline-flex h-10 items-center rounded-md px-3 text-sm font-medium transition-colors disabled:opacity-40",
              inProject ? "text-klein" : "text-ink/55 hover:text-ink",
            ].join(" ")}
          >
            {inProject ? "In project" : "+ Add to project"}
          </button>
          <a
            href={candidate.sourceUrl}
            target="_blank"
            rel="noreferrer"
            onClick={onOpen}
            className="inline-flex h-10 items-center px-1 text-sm text-ink/45 hover:text-ink"
          >
            Open source →
          </a>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-ink/8 pt-3">
          <button
            type="button"
            onClick={() => setWhyOpen((v) => !v)}
            aria-expanded={whyOpen}
            className="text-[0.72rem] font-medium uppercase tracking-[0.12em] text-ink/40 hover:text-ink/70"
          >
            Why this?
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onDismiss}
            className="text-[0.72rem] uppercase tracking-[0.12em] text-ink/25 hover:text-ink/50"
          >
            Dismiss
          </button>
        </div>

        {whyOpen ? (
          <div className="mt-3 rounded-md bg-paper/90 px-4 py-3 text-sm leading-relaxed text-ink/65">
            <p className="font-medium text-ink/80">Why you&apos;re seeing this</p>
            <p className="mt-2">{explanation.reason || explanation.summary}</p>
            {explanation.connection ? (
              <p className="mt-3 text-ink/55">
                <span className="font-medium text-ink/70">Connection — </span>
                {explanation.connection}
              </p>
            ) : null}
            {explanation.designTakeaway ? (
              <p className="mt-2 text-ink/55">
                <span className="font-medium text-ink/70">Takeaway — </span>
                {explanation.designTakeaway}
              </p>
            ) : null}
            {explanation.matchedPreferences.length > 0 ? (
              <ul className="mt-3 space-y-1 text-ink/50">
                {explanation.matchedPreferences.map((p) => (
                  <li key={p}>• You selected {p}</li>
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
              <p className="mt-2 font-medium text-klein">
                {explanation.mediumShift.from} → {explanation.mediumShift.to}
              </p>
            ) : null}
            {explanation.scores100 ? (
              <p className="mt-3 text-[0.7rem] uppercase tracking-[0.1em] text-ink/35">
                Relevance {explanation.scores100.relevance} · Project{" "}
                {explanation.scores100.projectFit} · Novelty{" "}
                {explanation.scores100.novelty} · Creative{" "}
                {explanation.scores100.creativeValue}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}
