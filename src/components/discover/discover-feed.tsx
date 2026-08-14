"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { RecommendationCard } from "@/components/discover/recommendation-card";
import { recordInteraction, refreshDiscoverFeed } from "@/lib/recsys/actions";
import {
  DISCOVER_FILTERS,
  type DiscoverFeed,
  type DiscoverFilter,
  type RankedRecommendation,
} from "@/lib/recsys/types";

type DiscoverFeedViewProps = {
  initial: DiscoverFeed;
};

function matchesFilter(item: RankedRecommendation, filter: DiscoverFilter) {
  if (filter === "All") return true;
  const hay = `${item.candidate.medium} ${item.candidate.category} ${item.candidate.tags.join(" ")}`.toLowerCase();
  if (filter === "Web") return /web|website/.test(hay);
  if (filter === "Creative Coding") return /creative coding|generative/.test(hay);
  return hay.includes(filter.toLowerCase());
}

export function DiscoverFeedView({ initial }: DiscoverFeedViewProps) {
  const [feed, setFeed] = useState(initial);
  const [filter, setFilter] = useState<DiscoverFilter>("All");
  const [query, setQuery] = useState("");
  const [saved, setSaved] = useState(() => new Set(initial.savedIds));
  const [inProject, setInProject] = useState(() => new Set(initial.projectRefIds));
  const [hidden, setHidden] = useState(() => new Set<string>());
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState(6);
  const [isPending, startTransition] = useTransition();

  const projectId = feed.project?.id ?? null;

  function applyFilter(items: RankedRecommendation[]) {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (hidden.has(item.candidate.slug)) return false;
      if (!matchesFilter(item, filter)) return false;
      if (!q) return true;
      const hay =
        `${item.candidate.title} ${item.candidate.description} ${item.candidate.tags.join(" ")}`.toLowerCase();
      return hay.includes(q);
    });
  }

  const forProject = useMemo(
    () => applyFilter(feed.sections.for_project),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [feed, filter, query, hidden],
  );
  const forYou = useMemo(
    () => applyFilter(feed.sections.for_you),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [feed, filter, query, hidden],
  );
  const unexpected = useMemo(
    () => applyFilter(feed.sections.unexpected),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [feed, filter, query, hidden],
  );

  async function act(
    item: RankedRecommendation,
    type: "save" | "unsave" | "add_to_project" | "dismiss" | "click",
  ) {
    const itemId = item.itemId;
    if (!itemId) {
      setError("Apply migration 013 to persist recommendations.");
      return;
    }
    setBusySlug(item.candidate.slug);
    setError(null);
    const tags = [
      ...item.candidate.tags,
      item.candidate.medium,
      item.candidate.category,
      ...item.candidate.aesthetics,
    ];
    const result = await recordInteraction({
      itemId,
      type,
      projectId,
      tags,
    });
    setBusySlug(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (type === "save") {
      setSaved((prev) => new Set(prev).add(itemId));
    }
    if (type === "unsave") {
      setSaved((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
    if (type === "add_to_project") {
      setInProject((prev) => new Set(prev).add(itemId));
      setSaved((prev) => new Set(prev).add(itemId));
    }
    if (type === "dismiss") {
      setHidden((prev) => new Set(prev).add(item.candidate.slug));
    }
  }

  function switchProject(id: string) {
    startTransition(async () => {
      const result = await refreshDiscoverFeed(id);
      if (result.ok) {
        setFeed(result.feed);
        setSaved(new Set(result.feed.savedIds));
        setInProject(new Set(result.feed.projectRefIds));
        setHidden(new Set());
      } else {
        setError(result.error);
      }
    });
  }

  const cardProps = (item: RankedRecommendation, featured = false) => ({
    item,
    featured,
    saved: item.itemId ? saved.has(item.itemId) : false,
    inProject: item.itemId ? inProject.has(item.itemId) : false,
    projectName: feed.project?.name ?? null,
    busy: busySlug === item.candidate.slug || isPending,
    onSave: () => {
      const isSaved = item.itemId ? saved.has(item.itemId) : false;
      void act(item, isSaved ? "unsave" : "save");
    },
    onAddToProject: () => void act(item, "add_to_project"),
    onDismiss: () => void act(item, "dismiss"),
    onOpen: () => void act(item, "click"),
  });

  return (
    <div className="w-full">
      <div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-3xl">
          <p className="text-[0.72rem] font-medium uppercase tracking-[0.16em] text-ink/40">
            Discover
          </p>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-bold tracking-[-0.035em] sm:text-5xl lg:text-[3.25rem]">
            {feed.project ? "For your project" : "Your creative world"}
          </h1>
          {feed.project ? (
            <p className="mt-3 text-xl leading-snug text-ink/60 sm:text-2xl">
              {feed.project.name}
            </p>
          ) : (
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-ink/55">
              Start a project to make your recommendations more specific.
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {feed.projects.length > 1 ? (
            <label className="flex items-center gap-2 text-sm text-ink/50">
              Project
              <select
                className="rounded-md border border-ink/15 bg-white/80 px-3 py-2 text-ink outline-none focus:border-klein/40"
                value={feed.project?.id ?? ""}
                onChange={(e) => switchProject(e.target.value)}
              >
                {feed.projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <input
            type="search"
            placeholder="Search references…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-11 w-full max-w-sm rounded-md border border-ink/12 bg-white/80 px-4 text-sm outline-none focus:border-klein/40 sm:w-64"
          />
        </div>
      </div>

      {!feed.project ? (
        <Link
          href="/dashboard"
          className="mt-6 inline-flex h-11 items-center rounded-md bg-klein px-5 text-sm font-medium text-white hover:bg-klein-deep"
        >
          Create project →
        </Link>
      ) : null}

      <div
        className="mt-10 flex flex-wrap gap-2"
        role="tablist"
        aria-label="Filter by medium"
      >
        {DISCOVER_FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            role="tab"
            aria-selected={filter === f}
            onClick={() => setFilter(f)}
            className={[
              "rounded-md px-3.5 py-2 text-sm tracking-wide transition-colors",
              filter === f
                ? "bg-ink text-paper"
                : "border border-ink/12 text-ink/55 hover:text-ink",
            ].join(" ")}
          >
            {f}
          </button>
        ))}
      </div>

      {error ? (
        <p className="mt-5 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      {feed.project && forProject.length > 0 ? (
        <section className="mt-14">
          <SectionHead title="For your project" subtitle={feed.project.name} />
          <CardGrid>
            {forProject.map((item, index) => (
              <RecommendationCard
                key={item.candidate.slug}
                {...cardProps(item, index === 0)}
              />
            ))}
          </CardGrid>
        </section>
      ) : null}

      <section className="mt-16">
        <SectionHead title="For you" subtitle="From your creative profile" />
        {forYou.length === 0 ? (
          <EmptyCopy text="Wisp is gathering references for you..." />
        ) : (
          <CardGrid>
            {forYou.slice(0, visible).map((item) => (
              <RecommendationCard
                key={item.candidate.slug}
                {...cardProps(item)}
              />
            ))}
          </CardGrid>
        )}
        {forYou.length > visible ? (
          <button
            type="button"
            onClick={() => setVisible((n) => n + 6)}
            className="mt-10 inline-flex h-11 items-center rounded-md border border-ink/12 px-5 text-sm text-ink/60 transition-colors hover:border-ink/25 hover:text-ink"
          >
            Load more references
          </button>
        ) : null}
      </section>

      <section className="mt-20 pb-8">
        <SectionHead
          title="Unexpected connections"
          subtitle="Outside your usual medium — still defensible"
        />
        {unexpected.length === 0 ? (
          <EmptyCopy text="Cross-medium connections will appear as your profile fills in." />
        ) : (
          <CardGrid>
            {unexpected.map((item) => (
              <RecommendationCard
                key={item.candidate.slug}
                {...cardProps(item)}
              />
            ))}
          </CardGrid>
        )}
      </section>
    </div>
  );
}

function SectionHead({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-8 border-b border-ink/8 pb-4">
      <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-[-0.025em] sm:text-[2rem]">
        {title}
      </h2>
      <p className="mt-1.5 text-base text-ink/45">{subtitle}</p>
    </div>
  );
}

/** Wide, neat grid — fewer larger cards instead of cramped masonry. */
function CardGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-7 sm:gap-8 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3">
      {children}
    </div>
  );
}

function EmptyCopy({ text }: { text: string }) {
  return <p className="text-lg text-ink/50">{text}</p>;
}
