/**
 * Ranking weights — Creative Value > Pure Similarity.
 * Keep here so they can be tuned or swapped for a learned ranker.
 *
 * Score = Σ w_i * f_i
 */
export const RANK_WEIGHTS = {
  userPreference: 0.28,
  projectRelevance: 0.32,
  semanticSimilarity: 0.15,
  novelty: 0.2,
  popularity: 0.05,
} as const;

export const DIVERSITY = {
  /** MMR λ: 1 = pure relevance, 0 = pure diversity */
  lambda: 0.72,
  maxPerMedium: 2,
  maxPerCategory: 3,
} as const;

export const FEED_TTL_MS = 8 * 60 * 1000;

export const SECTION_SIZES = {
  for_you: 10,
  for_project: 8,
  unexpected: 6,
} as const;

export const INTERACTION_TAG_DELTAS: Record<string, number> = {
  view: 0.01,
  click: 0.04,
  save: 0.12,
  unsave: -0.08,
  add_to_project: 0.18,
  dismiss: -0.16,
  share: 0.06,
  export: 0.08,
};

export type RankWeights = typeof RANK_WEIGHTS;
