import type {
  ProjectCreativeProfile,
  RecommendationCandidate,
  UserCreativeProfile,
} from "@/lib/recsys/types";
import { WISP_RECOMMENDATION_OUTPUT_SCHEMA } from "@/lib/recsys/prompts/system";

export function buildRecommendationUserMessage(input: {
  user: UserCreativeProfile;
  project: ProjectCreativeProfile;
  candidates: RecommendationCandidate[];
  savedTitles?: string[];
}): string {
  const { user, project, candidates, savedTitles = [] } = input;

  const profileBlock = [
    "USER PROFILE",
    `- Design roles: ${user.roles.join(", ") || "unspecified"}`,
    `- Design interests: ${user.interests.join(", ") || "unspecified"}`,
    `- Aesthetic preferences: ${user.aesthetics.join(", ") || "unspecified"}`,
    `- Preferred creative mediums: ${user.mediums.join(", ") || "unspecified"}`,
    `- Learned tag weights (positive = affinity): ${summarizeWeights(user.tagWeights)}`,
    savedTitles.length
      ? `- Recent saved references: ${savedTitles.slice(0, 8).join("; ")}`
      : "- Recent saved references: none yet",
  ].join("\n");

  const projectBlock = project
    ? [
        "CURRENT PROJECT",
        `- Project name: ${project.name}`,
        `- Project description: ${project.description || "unspecified"}`,
        `- Focus areas: ${project.focusAreas.join(", ") || "unspecified"}`,
      ].join("\n")
    : "CURRENT PROJECT\n- none — rank for the designer's overall creative world";

  const candidateBlock = candidates
    .map((c, i) =>
      [
        `CANDIDATE ${i + 1}`,
        `- candidate_id: ${c.slug}`,
        `- title: ${c.title}`,
        `- description: ${c.description}`,
        `- source: ${c.sourceName}`,
        `- medium: ${c.medium}`,
        `- category: ${c.category}`,
        `- tags: ${c.tags.join(", ")}`,
        `- aesthetics: ${c.aesthetics.join(", ")}`,
        `- concepts: ${c.concepts.join(", ")}`,
      ].join("\n"),
    )
    .join("\n\n");

  return `${profileBlock}

${projectBlock}

CANDIDATES
Rank and select from these candidates only. Do not invent new candidates.
Return a diverse mix: direct, adjacent, and experimental.
Prefer relevance + novelty over pure similarity.
Assign each item a section: for_project (strong project influence), for_you (profile fit), or unexpected (defensible cross-medium leap).

${candidateBlock}

Return JSON matching this shape exactly:
${WISP_RECOMMENDATION_OUTPUT_SCHEMA}

Select up to 18 recommendations total.
Prioritize creative expansion. Every item must have a clear reason, connection, and design_takeaway.`;
}

function summarizeWeights(weights: Record<string, number>): string {
  const entries = Object.entries(weights)
    .filter(([, w]) => Math.abs(w) >= 0.05)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, 12)
    .map(([tag, w]) => `${tag}:${w.toFixed(2)}`);
  return entries.length ? entries.join(", ") : "none yet";
}
