export type RecommendationOrigin =
  | "seed"
  | "web"
  | "pinterest"
  | "spotify"
  | "user"
  | "arena";

export type FeedSection = "for_you" | "for_project" | "unexpected";

export type InteractionType =
  | "view"
  | "click"
  | "save"
  | "unsave"
  | "dismiss"
  | "add_to_project"
  | "share"
  | "export";

export type RecommendationCandidate = {
  slug: string;
  title: string;
  description: string;
  sourceUrl: string;
  sourceName: string;
  imageUrl?: string | null;
  visualKey: string;
  category: string;
  medium: string;
  tags: string[];
  aesthetics: string[];
  concepts: string[];
  popularity: number;
  origin: RecommendationOrigin;
};

export type RecommendationSource = {
  id: string;
  label: string;
  /** Adapter may be a stub until credentials exist. */
  available: boolean;
  fetchCandidates: () => Promise<RecommendationCandidate[]>;
};

export type UserCreativeProfile = {
  userId: string;
  roles: string[];
  interests: string[];
  aesthetics: string[];
  mediums: string[];
  /** Flattened tokens used for lexical / future embedding input */
  text: string;
  tokens: string[];
  tagWeights: Record<string, number>;
};

export type ProjectCreativeProfile = {
  id: string;
  name: string;
  description: string;
  focusAreas: string[];
  text: string;
  tokens: string[];
} | null;

export type ScoreBreakdown = {
  preference: number;
  project: number;
  semantic: number;
  novelty: number;
  popularity: number;
  total: number;
};

export type RecommendationExplanation = {
  matchedPreferences: string[];
  projectName: string | null;
  projectBridges: string[];
  sharedConcepts: string[];
  mediumShift: { from: string; to: string } | null;
  summary: string;
};

export type RankedRecommendation = {
  candidate: RecommendationCandidate;
  itemId?: string;
  section: FeedSection;
  rank: number;
  scores: ScoreBreakdown;
  explanation: RecommendationExplanation;
};

export type DiscoverFeed = {
  generatedAt: string;
  stale: boolean;
  project: { id: string; name: string } | null;
  projects: Array<{ id: string; name: string }>;
  sections: {
    for_you: RankedRecommendation[];
    for_project: RankedRecommendation[];
    unexpected: RankedRecommendation[];
  };
  savedIds: string[];
  projectRefIds: string[];
  dismissedIds: string[];
};

export const DISCOVER_FILTERS = [
  "All",
  "Web",
  "UX",
  "UI",
  "Typography",
  "Motion",
  "Film",
  "Photography",
  "Architecture",
  "Creative Coding",
] as const;

export type DiscoverFilter = (typeof DISCOVER_FILTERS)[number];
