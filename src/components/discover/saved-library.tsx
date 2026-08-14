"use client";

import { visualFor } from "@/lib/recsys/visuals";
import type { RecommendationCandidate } from "@/lib/recsys/types";
import { useState } from "react";

type SavedLibraryProps = {
  items: Array<{ itemId: string; candidate: RecommendationCandidate }>;
};

export function SavedLibrary({ items }: SavedLibraryProps) {
  return (
    <div className="mt-10 columns-1 gap-5 sm:columns-2 xl:columns-3">
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
    <article className="mb-5 break-inside-avoid overflow-hidden rounded-md border border-ink/10 bg-white/70">
      <div className="aspect-[4/3] overflow-hidden">
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
            className="flex h-full items-center justify-center font-[family-name:var(--font-display)] text-4xl"
            style={visual.style}
          >
            {visual.mark}
          </div>
        )}
      </div>
      <div className="px-4 py-4">
        <p className="text-[0.65rem] uppercase tracking-[0.12em] text-ink/40">
          {candidate.medium}
        </p>
        <h2 className="mt-1 font-[family-name:var(--font-display)] text-lg font-semibold tracking-[-0.02em]">
          {candidate.title}
        </h2>
        <p className="mt-2 line-clamp-3 text-sm text-ink/55">
          {candidate.description}
        </p>
        <a
          href={candidate.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-block text-sm text-klein hover:underline"
        >
          Open source
        </a>
      </div>
    </article>
  );
}
