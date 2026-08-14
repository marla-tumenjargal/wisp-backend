import type { SupabaseClient } from "@supabase/supabase-js";
import { displayGraphName, type GraphRecord } from "@/lib/graphs/types";
import { buildProjectProfile, buildUserProfile } from "@/lib/recsys/profile";
import { rankFeed } from "@/lib/recsys/rank";
import { collectCandidates } from "@/lib/recsys/sources";
import { isMissingRelation, upsertCatalog } from "@/lib/recsys/store";
import type {
  DiscoverFeed,
  FeedSection,
  RankedRecommendation,
} from "@/lib/recsys/types";
import { FEED_TTL_MS } from "@/lib/recsys/weights";

type ProfileRow = {
  designer_roles?: string[] | null;
  design_interests?: string[] | null;
  aesthetics?: string[] | null;
  creative_mediums?: string[] | null;
  current_project_id?: string | null;
  display_name?: string | null;
};

export async function generateDiscoverFeed(
  supabase: SupabaseClient,
  userId: string,
  options: { projectId?: string | null; force?: boolean } = {},
): Promise<DiscoverFeed> {
  const [{ data: profile }, graphs, tagWeights, dismissed, saved, projectRefs] =
    await Promise.all([
      supabase
        .from("profiles")
        .select(
          "designer_roles, design_interests, aesthetics, creative_mediums, current_project_id, display_name",
        )
        .eq("id", userId)
        .maybeSingle(),
      loadGraphs(supabase, userId),
      loadTagWeights(supabase, userId),
      loadDismissed(supabase, userId),
      loadSaved(supabase, userId),
      loadProjectRefs(supabase, userId),
    ]);

  const profileRow = (profile ?? null) as ProfileRow | null;
  const requestedProjectId =
    options.projectId ?? profileRow?.current_project_id ?? graphs[0]?.id ?? null;
  const currentGraph =
    graphs.find((g) => g.id === requestedProjectId) ?? graphs[0] ?? null;

  if (!options.force) {
    const cached = await loadCachedFeed(
      supabase,
      userId,
      currentGraph?.id ?? null,
    );
    if (cached) {
      return {
        ...cached,
        project: currentGraph
          ? { id: currentGraph.id, name: displayGraphName(currentGraph) }
          : null,
        projects: graphs.map((g) => ({
          id: g.id,
          name: displayGraphName(g),
        })),
        savedIds: saved,
        projectRefIds: projectRefs,
        dismissedIds: [...dismissed],
      };
    }
  }

  const user = buildUserProfile(userId, profileRow, tagWeights);
  const project = buildProjectProfile(currentGraph);
  const candidates = await collectCandidates();
  const slugToId = await upsertCatalog(supabase, candidates).catch(
    () => new Map<string, string>(),
  );

  const ranked = rankFeed(candidates, user, project, dismissed);

  const attachIds = (items: RankedRecommendation[]) =>
    items.map((item) => ({
      ...item,
      itemId: slugToId.get(item.candidate.slug),
    }));

  const sections = {
    for_you: attachIds(ranked.for_you),
    for_project: attachIds(ranked.for_project),
    unexpected: attachIds(ranked.unexpected),
  };

  await persistFeed(supabase, userId, currentGraph?.id ?? null, sections);

  return {
    generatedAt: new Date().toISOString(),
    stale: false,
    project: currentGraph
      ? { id: currentGraph.id, name: displayGraphName(currentGraph) }
      : null,
    projects: graphs.map((g) => ({ id: g.id, name: displayGraphName(g) })),
    sections,
    savedIds: saved,
    projectRefIds: projectRefs,
    dismissedIds: [...dismissed],
  };
}

async function loadGraphs(
  supabase: SupabaseClient,
  userId: string,
): Promise<GraphRecord[]> {
  const { data, error } = await supabase
    .from("graphs")
    .select(
      "id, user_id, name, description, focus, creating, theme, goal, similarities, focus_areas, reference_image_url, aesthetic_brief, vault_name, vault_node_count, vault_edge_count, vault_synced_at, created_at, updated_at",
    )
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    if (isMissingRelation(error.message)) return [];
    const fallback = await supabase
      .from("graphs")
      .select(
        "id, user_id, name, description, focus, creating, theme, goal, similarities, reference_image_url, aesthetic_brief, vault_name, vault_node_count, vault_edge_count, vault_synced_at, created_at, updated_at",
      )
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });
    if (fallback.error) return [];
    return (fallback.data ?? []) as GraphRecord[];
  }
  return (data ?? []) as GraphRecord[];
}

async function loadTagWeights(
  supabase: SupabaseClient,
  userId: string,
): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from("user_tag_weights")
    .select("tag, weight")
    .eq("user_id", userId);
  if (error || !data) return {};
  const out: Record<string, number> = {};
  for (const row of data) {
    out[String(row.tag).toLowerCase()] = Number(row.weight) || 0;
  }
  return out;
}

async function loadDismissed(
  supabase: SupabaseClient,
  userId: string,
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("user_interactions")
    .select("item_id, recommendation_items(slug)")
    .eq("user_id", userId)
    .eq("interaction_type", "dismiss");
  if (error || !data) return new Set();
  const slugs = new Set<string>();
  for (const row of data) {
    const tag = row.recommendation_items as
      | { slug: string }
      | { slug: string }[]
      | null;
    const slug = Array.isArray(tag) ? tag[0]?.slug : tag?.slug;
    if (slug) slugs.add(slug);
  }
  return slugs;
}

async function loadSaved(
  supabase: SupabaseClient,
  userId: string,
): Promise<string[]> {
  const { data } = await supabase
    .from("user_saved_items")
    .select("item_id")
    .eq("user_id", userId);
  return (data ?? []).map((r) => r.item_id as string);
}

async function loadProjectRefs(
  supabase: SupabaseClient,
  userId: string,
): Promise<string[]> {
  const { data } = await supabase
    .from("project_references")
    .select("item_id")
    .eq("user_id", userId);
  return (data ?? []).map((r) => r.item_id as string);
}

async function loadCachedFeed(
  supabase: SupabaseClient,
  userId: string,
  projectId: string | null,
): Promise<DiscoverFeed | null> {
  const { data, error } = await supabase
    .from("user_recommendation_feed")
    .select(
      "item_id, project_id, section, rank, score, preference_score, project_score, semantic_score, novelty_score, popularity_score, explanation, generated_at, recommendation_items(*)",
    )
    .eq("user_id", userId)
    .order("rank", { ascending: true });

  if (error || !data?.length) return null;

  const generatedAt = data[0]?.generated_at as string;
  const age = Date.now() - new Date(generatedAt).getTime();
  if (age > FEED_TTL_MS) return null;
  if (projectId && data[0]?.project_id && data[0].project_id !== projectId) {
    return null;
  }

  const sections: DiscoverFeed["sections"] = {
    for_you: [],
    for_project: [],
    unexpected: [],
  };

  for (const row of data) {
    const item = row.recommendation_items as Record<string, unknown> | null;
    if (!item) continue;
    const section = row.section as FeedSection;
    if (!(section in sections)) continue;
    sections[section].push({
      itemId: row.item_id as string,
      section,
      rank: row.rank as number,
      scores: {
        preference: Number(row.preference_score),
        project: Number(row.project_score),
        semantic: Number(row.semantic_score),
        novelty: Number(row.novelty_score),
        popularity: Number(row.popularity_score),
        total: Number(row.score),
      },
      explanation: (row.explanation ?? {
        matchedPreferences: [],
        projectName: null,
        projectBridges: [],
        sharedConcepts: [],
        mediumShift: null,
        summary: "",
      }) as RankedRecommendation["explanation"],
      candidate: {
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
        origin: (item.origin as RankedRecommendation["candidate"]["origin"]) ?? "seed",
      },
    });
  }

  const hasItems =
    sections.for_you.length +
      sections.for_project.length +
      sections.unexpected.length >
    0;
  if (!hasItems) return null;

  return {
    generatedAt,
    stale: false,
    project: null,
    projects: [],
    sections,
    savedIds: [],
    projectRefIds: [],
    dismissedIds: [],
  };
}

async function persistFeed(
  supabase: SupabaseClient,
  userId: string,
  projectId: string | null,
  sections: DiscoverFeed["sections"],
) {
  const now = new Date().toISOString();
  const rows = (["for_you", "for_project", "unexpected"] as FeedSection[])
    .flatMap((section) =>
      sections[section]
        .filter((item) => item.itemId)
        .map((item) => ({
          user_id: userId,
          item_id: item.itemId,
          project_id: projectId,
          section,
          rank: item.rank,
          score: item.scores.total,
          preference_score: item.scores.preference,
          project_score: item.scores.project,
          semantic_score: item.scores.semantic,
          novelty_score: item.scores.novelty,
          popularity_score: item.scores.popularity,
          explanation: item.explanation,
          generated_at: now,
        })),
    );

  if (rows.length === 0) return;

  await supabase.from("user_recommendation_feed").delete().eq("user_id", userId);
  const { error } = await supabase.from("user_recommendation_feed").insert(rows);
  if (error && !isMissingRelation(error.message)) {
    console.error("feed persist failed", error.message);
  }
}
