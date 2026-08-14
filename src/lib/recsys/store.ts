import type { SupabaseClient } from "@supabase/supabase-js";
import type { RecommendationCandidate } from "@/lib/recsys/types";
import { SEED_CATALOG } from "@/lib/recsys/sources/seed-catalog";

export function isMissingRelation(message: string) {
  return /relation .* does not exist|Could not find the table|schema cache|column .* does not exist/i.test(
    message,
  );
}

export async function upsertCatalog(
  supabase: SupabaseClient,
  candidates: RecommendationCandidate[],
): Promise<Map<string, string>> {
  const slugToId = new Map<string, string>();
  const rows = candidates.map((c) => ({
    slug: c.slug,
    title: c.title,
    description: c.description,
    source_url: c.sourceUrl,
    source_name: c.sourceName,
    image_url: c.imageUrl ?? null,
    visual_key: c.visualKey,
    category: c.category,
    medium: c.medium,
    tags: c.tags,
    aesthetics: c.aesthetics,
    concepts: c.concepts,
    popularity: c.popularity,
    origin: c.origin,
    updated_at: new Date().toISOString(),
  }));

  const { data, error } = await supabase
    .from("recommendation_items")
    .upsert(rows, { onConflict: "slug" })
    .select("id, slug");

  if (error) {
    if (isMissingRelation(error.message)) return slugToId;
    throw new Error(error.message);
  }

  for (const row of data ?? []) {
    slugToId.set(row.slug as string, row.id as string);
  }
  return slugToId;
}

export function candidateBySlug(slug: string): RecommendationCandidate | undefined {
  return SEED_CATALOG.find((c) => c.slug === slug);
}

export type FeedRow = {
  user_id: string;
  item_id: string;
  project_id: string | null;
  section: string;
  rank: number;
  score: number;
  preference_score: number;
  project_score: number;
  semantic_score: number;
  novelty_score: number;
  popularity_score: number;
  explanation: Record<string, unknown>;
  generated_at: string;
};
