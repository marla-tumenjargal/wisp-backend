import { conceptsForText } from "@/lib/recsys/concepts";
import type {
  FeedSection,
  ProjectCreativeProfile,
  RankedRecommendation,
  RecommendationCandidate,
  RecommendationExplanation,
  ScoreBreakdown,
  UserCreativeProfile,
} from "@/lib/recsys/types";
import { clamp01, cosineBag, jaccard, overlap, unique } from "@/lib/recsys/text";
import { DIVERSITY, RANK_WEIGHTS, SECTION_SIZES } from "@/lib/recsys/weights";

function candidateTokens(item: RecommendationCandidate): string[] {
  return unique([
    ...item.tags,
    ...item.aesthetics,
    ...item.concepts,
    item.category,
    item.medium,
    item.title,
  ]).map((s) => s.toLowerCase());
}

function preferenceScore(
  item: RecommendationCandidate,
  user: UserCreativeProfile,
): number {
  const userSet = unique([
    ...user.interests,
    ...user.aesthetics,
    ...user.mediums,
    ...user.roles,
  ]);
  const itemSet = unique([
    ...item.tags,
    ...item.aesthetics,
    item.category,
    item.medium,
  ]);
  let score = jaccard(userSet, itemSet);

  if (user.mediums.some((m) => m.toLowerCase() === item.medium.toLowerCase())) {
    score += 0.18;
  }
  if (
    user.aesthetics.some((a) =>
      item.aesthetics.some((ia) => ia.toLowerCase() === a.toLowerCase()),
    )
  ) {
    score += 0.16;
  }
  if (
    user.interests.some(
      (i) =>
        i.toLowerCase() === item.category.toLowerCase() ||
        item.tags.some((t) => t.toLowerCase() === i.toLowerCase()),
    )
  ) {
    score += 0.14;
  }

  let learned = 0;
  const keys = [...item.tags, ...item.aesthetics, item.category, item.medium];
  for (const key of keys) {
    learned += user.tagWeights[key.toLowerCase()] ?? 0;
  }
  if (keys.length) learned /= keys.length;
  score += learned * 0.35;

  return clamp01(score);
}

function projectScore(
  item: RecommendationCandidate,
  project: ProjectCreativeProfile,
): number {
  if (!project) return 0;
  const itemTokens = candidateTokens(item);
  const lexical = cosineBag(project.tokens, itemTokens);
  const conceptHit = overlap(item.concepts, project.tokens).length;
  const nameHit = itemTokens.some((t) =>
    project.name.toLowerCase().split(/\s+/).includes(t),
  )
    ? 0.12
    : 0;
  const focusHit = project.focusAreas.some(
    (f) =>
      f.toLowerCase() === item.category.toLowerCase() ||
      item.tags.some((t) => t.toLowerCase() === f.toLowerCase()),
  )
    ? 0.2
    : 0;

  return clamp01(lexical * 0.7 + Math.min(0.3, conceptHit * 0.1) + nameHit + focusHit);
}

function semanticScore(
  item: RecommendationCandidate,
  user: UserCreativeProfile,
  project: ProjectCreativeProfile,
): number {
  const itemTokens = candidateTokens(item);
  const userSim = cosineBag(user.tokens, itemTokens);
  const projectSim = project ? cosineBag(project.tokens, itemTokens) : 0;
  const conceptSim = jaccard(
    item.concepts,
    unique([
      ...conceptsForText(user.text),
      ...(project ? conceptsForText(project.text) : []),
    ]),
  );
  return clamp01(userSim * 0.45 + projectSim * 0.35 + conceptSim * 0.2);
}

function noveltyScore(
  item: RecommendationCandidate,
  user: UserCreativeProfile,
): number {
  const mediumMatch = user.mediums.some(
    (m) => m.toLowerCase() === item.medium.toLowerCase(),
  );
  const categoryMatch = user.interests.some(
    (i) => i.toLowerCase() === item.category.toLowerCase(),
  );
  if (!mediumMatch && !categoryMatch) return 0.92;
  if (!mediumMatch && categoryMatch) return 0.7;
  if (mediumMatch && !categoryMatch) return 0.45;
  return 0.22;
}

export function scoreCandidate(
  item: RecommendationCandidate,
  user: UserCreativeProfile,
  project: ProjectCreativeProfile,
): ScoreBreakdown {
  const preference = preferenceScore(item, user);
  const projectRel = projectScore(item, project);
  const semantic = semanticScore(item, user, project);
  const novelty = noveltyScore(item, user);
  const popularity = clamp01(item.popularity);
  const total =
    RANK_WEIGHTS.userPreference * preference +
    RANK_WEIGHTS.projectRelevance * projectRel +
    RANK_WEIGHTS.semanticSimilarity * semantic +
    RANK_WEIGHTS.novelty * novelty +
    RANK_WEIGHTS.popularity * popularity;

  return {
    preference,
    project: projectRel,
    semantic,
    novelty,
    popularity,
    total,
  };
}

export function explainRecommendation(
  item: RecommendationCandidate,
  user: UserCreativeProfile,
  project: ProjectCreativeProfile,
  scores: ScoreBreakdown,
): RecommendationExplanation {
  const matchedPreferences = unique([
    ...overlap(user.aesthetics, item.aesthetics),
    ...overlap(user.interests, [...item.tags, item.category]),
    ...overlap(user.mediums, [item.medium, ...item.tags]),
  ]).slice(0, 5);

  const projectBridges = project
    ? overlap(
        [...item.concepts, ...item.tags],
        unique([...project.tokens, ...conceptsForText(project.text)]),
      ).slice(0, 4)
    : [];

  const sharedConcepts = overlap(
    item.concepts,
    unique([
      ...conceptsForText(user.text),
      ...(project ? conceptsForText(project.text) : []),
    ]),
  ).slice(0, 4);

  const primaryMedium = user.mediums[0] ?? user.interests[0] ?? null;
  const mediumShift =
    primaryMedium &&
    primaryMedium.toLowerCase() !== item.medium.toLowerCase() &&
    scores.novelty >= 0.55
      ? { from: primaryMedium, to: item.medium }
      : null;

  const conceptPhrase =
    sharedConcepts[0]?.replace(/-/g, " ") ||
    projectBridges[0]?.replace(/-/g, " ") ||
    item.concepts[0]?.replace(/-/g, " ") ||
    item.tags[0] ||
    "composition and hierarchy";

  const reasonParts: string[] = [];
  if (project) {
    reasonParts.push(`you're working on ${project.name}`);
  }
  if (matchedPreferences.length) {
    reasonParts.push(
      `you care about ${matchedPreferences.slice(0, 3).join(", ")}`,
    );
  }
  if (mediumShift) {
    reasonParts.push(
      `this ${item.medium.toLowerCase()} reference opens a cross-medium leap from ${mediumShift.from}`,
    );
  }

  const reason =
    reasonParts.length > 0
      ? `Recommended because ${reasonParts.join(" and ")}.`
      : `Recommended because it expands how ${item.category.toLowerCase()} can feel beyond familiar templates.`;

  const connection = project
    ? `${item.title} connects to ${project.name} through ${conceptPhrase} — a pattern that can transfer across mediums.`
    : `${item.title} bridges ${matchedPreferences.slice(0, 2).join(" / ") || "your taste"} with ${item.medium.toLowerCase()} thinking around ${conceptPhrase}.`;

  const designCue =
    item.tags[0] ||
    item.aesthetics[0]?.toLowerCase() ||
    item.category.toLowerCase();
  const designTakeaway = `You could take inspiration from its ${designCue} treatment — specifically how ${conceptPhrase} organizes attention.`;

  const summary = `${reason} ${designTakeaway}`;

  return {
    matchedPreferences,
    projectName: project?.name ?? null,
    projectBridges,
    sharedConcepts,
    mediumShift,
    summary,
    reason,
    connection,
    designTakeaway,
    scores100: {
      novelty: Math.round(scores.novelty * 100),
      relevance: Math.round(scores.preference * 100),
      projectFit: Math.round(scores.project * 100),
      creativeValue: Math.round(
        ((scores.novelty + scores.preference + scores.project) / 3) * 100,
      ),
    },
    medium: item.medium,
    category: item.category,
  };
}

function itemSimilarity(
  a: RecommendationCandidate,
  b: RecommendationCandidate,
): number {
  return jaccard(
    [...a.tags, a.medium, a.category, ...a.aesthetics],
    [...b.tags, b.medium, b.category, ...b.aesthetics],
  );
}

/** Maximal Marginal Relevance with medium/category caps. */
export function diversify(
  scored: Array<{
    candidate: RecommendationCandidate;
    scores: ScoreBreakdown;
  }>,
  limit: number,
): typeof scored {
  const selected: typeof scored = [];
  const remaining = [...scored].sort((a, b) => b.scores.total - a.scores.total);
  const mediumCounts = new Map<string, number>();
  const categoryCounts = new Map<string, number>();

  while (selected.length < limit && remaining.length > 0) {
    let bestIdx = 0;
    let bestMmr = -Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const cand = remaining[i]!;
      const med = cand.candidate.medium;
      const cat = cand.candidate.category;
      if ((mediumCounts.get(med) ?? 0) >= DIVERSITY.maxPerMedium) continue;
      if ((categoryCounts.get(cat) ?? 0) >= DIVERSITY.maxPerCategory) continue;
      const maxSim =
        selected.length === 0
          ? 0
          : Math.max(
              ...selected.map((s) =>
                itemSimilarity(s.candidate, cand.candidate),
              ),
            );
      const mmr =
        DIVERSITY.lambda * cand.scores.total - (1 - DIVERSITY.lambda) * maxSim;
      if (mmr > bestMmr) {
        bestMmr = mmr;
        bestIdx = i;
      }
    }
    const next = remaining.splice(bestIdx, 1)[0];
    if (!next) break;
    if (
      (mediumCounts.get(next.candidate.medium) ?? 0) >= DIVERSITY.maxPerMedium
    ) {
      continue;
    }
    selected.push(next);
    mediumCounts.set(
      next.candidate.medium,
      (mediumCounts.get(next.candidate.medium) ?? 0) + 1,
    );
    categoryCounts.set(
      next.candidate.category,
      (categoryCounts.get(next.candidate.category) ?? 0) + 1,
    );
  }

  return selected;
}

export function rankFeed(
  candidates: RecommendationCandidate[],
  user: UserCreativeProfile,
  project: ProjectCreativeProfile,
  dismissedSlugs: Set<string>,
): Record<FeedSection, RankedRecommendation[]> {
  const scored = candidates
    .filter((c) => !dismissedSlugs.has(c.slug))
    .map((candidate) => ({
      candidate,
      scores: scoreCandidate(candidate, user, project),
    }));

  const forYouPool = diversify(
    scored,
    SECTION_SIZES.for_you + 4,
  );

  const projectPool = project
    ? diversify(
        [...scored].sort((a, b) => b.scores.project - a.scores.project),
        SECTION_SIZES.for_project + 4,
      )
    : [];

  const unexpectedPool = diversify(
    scored.filter((s) => s.scores.novelty >= 0.55),
    SECTION_SIZES.unexpected + 3,
  );

  function toRanked(
    list: typeof scored,
    section: FeedSection,
    size: number,
    used: Set<string>,
  ): RankedRecommendation[] {
    const out: RankedRecommendation[] = [];
    for (const row of list) {
      if (used.has(row.candidate.slug)) continue;
      used.add(row.candidate.slug);
      out.push({
        candidate: row.candidate,
        section,
        rank: out.length,
        scores: row.scores,
        explanation: explainRecommendation(
          row.candidate,
          user,
          project,
          row.scores,
        ),
      });
      if (out.length >= size) break;
    }
    return out;
  }

  const used = new Set<string>();
  const for_project = toRanked(
    projectPool,
    "for_project",
    SECTION_SIZES.for_project,
    used,
  );
  const unexpected = toRanked(
    unexpectedPool,
    "unexpected",
    SECTION_SIZES.unexpected,
    used,
  );
  const for_you = toRanked(forYouPool, "for_you", SECTION_SIZES.for_you, used);

  return { for_you, for_project, unexpected };
}
