"use client";

import { visualFor } from "@/lib/recsys/visuals";
import type { RecommendationCandidate } from "@/lib/recsys/types";
import { useState } from "react";

type SavedLibraryProps = {
  items: Array<{ itemId: string; candidate: RecommendationCandidate }>;
};

export function SavedLibrary({ items }: SavedLibraryProps) {
  return (
    <div className="mt-10 grid grid-cols-1 gap-7 sm:gap-8 md:grid-cols-2 2xl:grid-cols-3">
      {items.map(({ candidate }) => (
        <SavedCard key={candidate.slug} candidate={candidate} />
      ))}
    </div>
  );
}

function SavedCard({ candidate }: { candidate: RecommendationCandidate }) {
  const [imgFailed, setImgFailed] = useState(false);
  const visual = visualFor(candidate.visualKey);
  const showImage = Boolean(candidate.imageUrl) && !imgFailed;

  return (
    <article className="overflow-hidden rounded-lg border border-ink/10 bg-white/80">
      <div className="aspect-[5/4] overflow-hidden">
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={candidate.imageUrl ?? ""}
            alt=""
            className="h-full w-full object-cover"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div
            className="flex h-full items-center justify-center font-[family-name:var(--font-display)] text-5xl"
            style={visual.style}
          >
            {visual.mark}
          </div>
        )}
      </div>
      <div className="px-5 py-5 sm:px-6 sm:py-6">
        <p className="text-[0.7rem] uppercase tracking-[0.14em] text-ink/40">
          {candidate.medium}
        </p>
        <h2 className="mt-2 font-[family-name:var(--font-display)] text-xl font-semibold tracking-[-0.02em]">
          {candidate.title}
        </h2>
        <p className="mt-3 line-clamp-3 text-base leading-relaxed text-ink/55">
          {candidate.description}
        </p>
        <a
          href={candidate.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-block text-sm text-klein hover:underline"
        >
          Open source →
        </a>
      </div>
    </article>
  );
}
