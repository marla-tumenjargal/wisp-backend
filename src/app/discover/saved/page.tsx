import Link from "next/link";
import { SavedLibrary } from "@/components/discover/saved-library";
import { isMissingRelation } from "@/lib/recsys/store";
import type { RecommendationCandidate } from "@/lib/recsys/types";
import { createClient } from "@/lib/supabase/server";

export default async function SavedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("user_saved_items")
    .select("item_id, created_at, recommendation_items(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error && isMissingRelation(error.message)) {
    return (
      <EmptySaved note="Run migration 013 to enable saved references." />
    );
  }

  const items = (data ?? [])
    .map((row) => {
      const item = row.recommendation_items as Record<string, unknown> | null;
      if (!item) return null;
      const candidate: RecommendationCandidate = {
        slug: String(item.slug),
        title: String(item.title),
        description: String(item.description ?? ""),
        sourceUrl: String(item.source_url),
        sourceName: String(item.source_name ?? "seed"),
        imageUrl: (item.image_url as string | null) ?? null,
        visualKey: String(item.visual_key ?? "editorial"),
        category: String(item.category),
        medium: String(item.medium),
        tags: Array.isArray(item.tags) ? (item.tags as string[]) : [],
        aesthetics: Array.isArray(item.aesthetics)
          ? (item.aesthetics as string[])
          : [],
        concepts: Array.isArray(item.concepts) ? (item.concepts as string[]) : [],
        popularity: Number(item.popularity ?? 0.5),
        origin: "seed",
      };
      return { itemId: row.item_id as string, candidate };
    })
    .filter((x): x is { itemId: string; candidate: RecommendationCandidate } =>
      Boolean(x),
    );

  if (items.length === 0) {
    return <EmptySaved />;
  }

  return (
    <div>
      <p className="text-[0.7rem] font-medium uppercase tracking-[0.14em] text-ink/40">
        Library
      </p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl font-bold tracking-[-0.03em]">
        Saved
      </h1>
      <p className="mt-2 text-ink/50">
        Wisp learns from what you keep.
      </p>
      <SavedLibrary items={items} />
    </div>
  );
}

function EmptySaved({ note }: { note?: string }) {
  return (
    <div className="max-w-md py-10">
      <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold tracking-[-0.03em]">
        Saved
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-ink/60">
        Save something that catches your eye. Wisp will learn from it.
      </p>
      {note ? <p className="mt-3 text-sm text-ink/45">{note}</p> : null}
      <Link
        href="/discover"
        className="mt-8 inline-flex h-10 items-center rounded-md bg-klein px-4 text-sm font-medium text-white hover:bg-klein-deep"
      >
        Back to Discover
      </Link>
    </div>
  );
}
