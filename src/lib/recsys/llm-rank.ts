import {
  buildRecommendationUserMessage,
} from "@/lib/recsys/prompts/build-user-message";
import { WISP_RECOMMENDATION_SYSTEM_PROMPT } from "@/lib/recsys/prompts/system";
import type {
  FeedSection,
  ProjectCreativeProfile,
  RankedRecommendation,
  RecommendationCandidate,
  RecommendationExplanation,
  ScoreBreakdown,
  UserCreativeProfile,
} from "@/lib/recsys/types";

type LlmRecommendation = {
  candidate_id?: string;
  title?: string;
  reason?: string;
  connection?: string;
  design_takeaway?: string;
  medium?: string;
  category?: string;
  section?: string;
  novelty_score?: number;
  relevance_score?: number;
  project_fit_score?: number;
  creative_value_score?: number;
};

function safeJsonParse(text: string): unknown {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fence ? fence[1]!.trim() : trimmed;
  return JSON.parse(raw);
}

function clampScore(n: unknown): number {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, Math.round(v)));
}

function asSection(value: unknown, fallback: FeedSection): FeedSection {
  if (value === "for_you" || value === "for_project" || value === "unexpected") {
    return value;
  }
  return fallback;
}

function scoresFromLlm(row: LlmRecommendation): ScoreBreakdown {
  const relevance = clampScore(row.relevance_score) / 100;
  const project = clampScore(row.project_fit_score) / 100;
  const novelty = clampScore(row.novelty_score) / 100;
  const creative = clampScore(row.creative_value_score) / 100;
  const semantic = (relevance + creative) / 2;
  const popularity = 0.5;
  const total =
    0.28 * relevance +
    0.32 * project +
    0.15 * semantic +
    0.2 * novelty +
    0.05 * popularity +
    0.1 * creative;

  return {
    preference: relevance,
    project,
    semantic,
    novelty,
    popularity,
    total: Math.min(1, total),
  };
}

function explanationFromLlm(
  row: LlmRecommendation,
  candidate: RecommendationCandidate,
  project: ProjectCreativeProfile,
  heuristic: RecommendationExplanation,
): RecommendationExplanation {
  const reason =
    typeof row.reason === "string" && row.reason.trim()
      ? row.reason.trim()
      : heuristic.summary;
  const connection =
    typeof row.connection === "string" && row.connection.trim()
      ? row.connection.trim()
      : heuristic.connection;
  const designTakeaway =
    typeof row.design_takeaway === "string" && row.design_takeaway.trim()
      ? row.design_takeaway.trim()
      : heuristic.designTakeaway;

  return {
    ...heuristic,
    reason,
    connection,
    designTakeaway,
    summary: `${reason} ${designTakeaway}`.trim(),
    projectName: project?.name ?? heuristic.projectName,
    llm: true,
    scores100: {
      novelty: clampScore(row.novelty_score),
      relevance: clampScore(row.relevance_score),
      projectFit: clampScore(row.project_fit_score),
      creativeValue: clampScore(row.creative_value_score),
    },
    medium: row.medium || candidate.medium,
    category: row.category || candidate.category,
  };
}

/**
 * Optional LLM pass — uses the Wisp system prompt to rerank + rewrite
 * explanations. Falls back silently when no API key / request fails.
 */
export async function llmRankRecommendations(input: {
  user: UserCreativeProfile;
  project: ProjectCreativeProfile;
  shortlist: RankedRecommendation[];
  savedTitles?: string[];
}): Promise<Record<FeedSection, RankedRecommendation[]> | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey || input.shortlist.length === 0) return null;

  const bySlug = new Map(
    input.shortlist.map((r) => [r.candidate.slug, r] as const),
  );
  const candidates = input.shortlist.map((r) => r.candidate);

  const userMessage = buildRecommendationUserMessage({
    user: input.user,
    project: input.project,
    candidates,
    savedTitles: input.savedTitles,
  });

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.55,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: WISP_RECOMMENDATION_SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("wisp llm rank failed", res.status, errText.slice(0, 240));
      return null;
    }

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const contentText = json.choices?.[0]?.message?.content;
    if (!contentText) return null;

    const parsed = safeJsonParse(contentText) as {
      recommendations?: LlmRecommendation[];
    };
    const rows = Array.isArray(parsed.recommendations)
      ? parsed.recommendations
      : [];
    if (rows.length === 0) return null;

    const sections: Record<FeedSection, RankedRecommendation[]> = {
      for_you: [],
      for_project: [],
      unexpected: [],
    };
    const used = new Set<string>();

    for (const row of rows) {
      const slug = typeof row.candidate_id === "string" ? row.candidate_id : "";
      const base = bySlug.get(slug);
      if (!base || used.has(slug)) continue;
      used.add(slug);

      const section = asSection(
        row.section,
        base.section === "for_project"
          ? "for_project"
          : base.scores.novelty >= 0.55
            ? "unexpected"
            : "for_you",
      );

      sections[section].push({
        ...base,
        section,
        rank: sections[section].length,
        scores: scoresFromLlm(row),
        explanation: explanationFromLlm(
          row,
          base.candidate,
          input.project,
          base.explanation,
        ),
      });
    }

    // Keep unused shortlist items so the feed never collapses
    for (const item of input.shortlist) {
      if (used.has(item.candidate.slug)) continue;
      const section = item.section;
      sections[section].push({
        ...item,
        rank: sections[section].length,
      });
    }

    const total =
      sections.for_you.length +
      sections.for_project.length +
      sections.unexpected.length;
    return total > 0 ? sections : null;
  } catch (err) {
    console.error("wisp llm rank error", err);
    return null;
  }
}
