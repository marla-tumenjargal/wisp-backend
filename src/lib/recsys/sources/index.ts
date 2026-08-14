import type { RecommendationCandidate, RecommendationSource } from "@/lib/recsys/types";
import { SEED_CATALOG } from "@/lib/recsys/sources/seed-catalog";

export const seedSource: RecommendationSource = {
  id: "seed",
  label: "Wisp curated catalog",
  available: true,
  async fetchCandidates() {
    return SEED_CATALOG;
  },
};

/**
 * Stubs for future adapters. They return empty arrays until
 * credentials and OAuth exist — never fabricate connected data.
 */
function unavailable(id: string, label: string): RecommendationSource {
  return {
    id,
    label,
    available: false,
    async fetchCandidates() {
      return [] as RecommendationCandidate[];
    },
  };
}

export const pinterestSource = unavailable("pinterest", "Pinterest");
export const spotifySource = unavailable("spotify", "Spotify");
export const webSource = unavailable("web", "Web crawl");

export const RECOMMENDATION_SOURCES: RecommendationSource[] = [
  seedSource,
  pinterestSource,
  spotifySource,
  webSource,
];

export async function collectCandidates(): Promise<RecommendationCandidate[]> {
  const batches = await Promise.all(
    RECOMMENDATION_SOURCES.filter((s) => s.available).map((s) =>
      s.fetchCandidates().catch(() => [] as RecommendationCandidate[]),
    ),
  );
  const bySlug = new Map<string, RecommendationCandidate>();
  for (const item of batches.flat()) {
    bySlug.set(item.slug, item);
  }
  return [...bySlug.values()];
}
