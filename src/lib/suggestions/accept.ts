import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AcceptResult, BoardSuggestion } from "@/lib/suggestions/types";

/**
 * Accept any board suggestion into a specific graph's vault_nodes / vault_edges.
 */
export async function acceptBoardSuggestion(
  userId: string,
  graphId: string,
  suggestion: BoardSuggestion,
): Promise<AcceptResult> {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const source = suggestion.kind;
  const externalId = suggestion.id.replace(/^[^:]+:/, "");
  const path = `${source}/${externalId}`;

  const tags = [
    suggestion.matchedInterest,
    suggestion.kind,
    typeof suggestion.meta.channelSlug === "string"
      ? suggestion.meta.channelSlug
      : null,
    typeof suggestion.meta.publication === "string"
      ? suggestion.meta.publication
      : null,
    typeof suggestion.meta.family === "string" ? "font" : null,
  ].filter((t): t is string => Boolean(t));

  const { data: existing } = await admin
    .from("vault_nodes")
    .select("id")
    .eq("user_id", userId)
    .eq("graph_id", graphId)
    .eq("source", source)
    .eq("external_id", externalId)
    .maybeSingle();

  let nodeId = existing?.id as string | undefined;

  const payload = {
    title: suggestion.title,
    filename: `${externalId}.${source}`,
    path,
    body: suggestion.sourceUrl || suggestion.subtitle || suggestion.title,
    frontmatter: {
      kind: suggestion.kind,
      suggestion_id: suggestion.id,
      ...suggestion.meta,
      interest: suggestion.matchedInterest,
      preview: suggestion.preview,
      subtitle: suggestion.subtitle,
    },
    tags,
    image_url: suggestion.imageUrl,
    arena_url: suggestion.kind === "arena" ? suggestion.sourceUrl : null,
    synced_at: now,
    updated_at: now,
    graph_id: graphId,
  };

  if (nodeId) {
    const { error } = await admin
      .from("vault_nodes")
      .update(payload)
      .eq("id", nodeId);
    if (error) throw new Error(error.message);
  } else {
    nodeId = randomUUID();
    const { error } = await admin.from("vault_nodes").insert({
      id: nodeId,
      user_id: userId,
      wikilinks: [],
      source,
      external_id: externalId,
      ...payload,
    });
    if (error) throw new Error(error.message);
  }

  const { data: peers } = await admin
    .from("vault_nodes")
    .select("id, tags, created_at")
    .eq("user_id", userId)
    .eq("graph_id", graphId)
    .neq("id", nodeId)
    .order("created_at", { ascending: false })
    .limit(40);

  const tagSet = new Set(tags.map((t) => t.toLowerCase()));
  const edgeRows: {
    id: string;
    user_id: string;
    graph_id: string;
    source_node_id: string;
    target_node_id: string;
    edge_type: "shared_interest" | "co_accepted";
    weight: number;
    metadata: Record<string, unknown>;
  }[] = [];

  const skipTags = new Set([
    "arena",
    "font",
    "color",
    "song",
    "substack",
  ]);

  for (const peer of peers ?? []) {
    const peerTags = ((peer.tags as string[]) ?? []).map((t) => t.toLowerCase());
    const shared = peerTags.filter((t) => tagSet.has(t) && !skipTags.has(t));
    const [src, tgt] =
      nodeId < (peer.id as string)
        ? [nodeId, peer.id as string]
        : [peer.id as string, nodeId];

    if (shared.length >= 1) {
      edgeRows.push({
        id: randomUUID(),
        user_id: userId,
        graph_id: graphId,
        source_node_id: src,
        target_node_id: tgt,
        edge_type: "shared_interest",
        weight: shared.length,
        metadata: { shared_tags: shared },
      });
    } else {
      edgeRows.push({
        id: randomUUID(),
        user_id: userId,
        graph_id: graphId,
        source_node_id: src,
        target_node_id: tgt,
        edge_type: "co_accepted",
        weight: 0.5,
        metadata: { reason: "board_ok" },
      });
    }
  }

  const sharedInterest = edgeRows.filter((e) => e.edge_type === "shared_interest");
  const coAccepted = edgeRows
    .filter((e) => e.edge_type === "co_accepted")
    .slice(0, 5);
  const toInsert = [...sharedInterest, ...coAccepted];

  if (toInsert.length > 0) {
    for (const edge of toInsert) {
      await admin.from("vault_edges").upsert(edge as never, {
        onConflict: "graph_id,source_node_id,target_node_id,edge_type",
        ignoreDuplicates: true,
      });
    }
  }

  await admin
    .from("graphs")
    .update({ updated_at: now })
    .eq("id", graphId)
    .eq("user_id", userId);

  const [{ count: nodeCount }, { count: edgeCount }] = await Promise.all([
    admin
      .from("vault_nodes")
      .select("*", { count: "exact", head: true })
      .eq("graph_id", graphId),
    admin
      .from("vault_edges")
      .select("*", { count: "exact", head: true })
      .eq("graph_id", graphId),
  ]);

  return {
    node_id: nodeId,
    edges_created: toInsert.length,
    node_count: nodeCount ?? 0,
    edge_count: edgeCount ?? 0,
  };
}
