import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ArenaSuggestion } from "@/lib/arena/recommend";

export type AcceptResult = {
  node_id: string;
  edges_created: number;
  node_count: number;
  edge_count: number;
};

/**
 * OK an Are.na suggestion into the user's knowledge graph
 * (same vault_nodes / vault_edges tables as Obsidian).
 */
export async function acceptArenaSuggestion(
  userId: string,
  suggestion: ArenaSuggestion,
): Promise<AcceptResult> {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const externalId = String(suggestion.id);
  const path = `arena/${externalId}`;
  const tags = [
    suggestion.matchedInterest,
    suggestion.channelSlug,
    suggestion.type.toLowerCase(),
    "arena",
  ].filter(Boolean);

  // Upsert by user + path (unique) — also check existing external id
  const { data: existing } = await admin
    .from("vault_nodes")
    .select("id")
    .eq("user_id", userId)
    .eq("source", "arena")
    .eq("external_id", externalId)
    .maybeSingle();

  let nodeId = existing?.id as string | undefined;

  if (nodeId) {
    const { error } = await admin
      .from("vault_nodes")
      .update({
        title: suggestion.title,
        filename: `${externalId}.arena`,
        path,
        body: suggestion.sourceUrl || suggestion.arenaUrl,
        frontmatter: {
          arena_id: suggestion.id,
          type: suggestion.type,
          channel: suggestion.channelSlug,
          interest: suggestion.matchedInterest,
        },
        tags,
        image_url: suggestion.imageUrl,
        arena_url: suggestion.arenaUrl,
        synced_at: now,
        updated_at: now,
      })
      .eq("id", nodeId);
    if (error) throw new Error(error.message);
  } else {
    nodeId = randomUUID();
    const { error } = await admin.from("vault_nodes").insert({
      id: nodeId,
      user_id: userId,
      title: suggestion.title,
      filename: `${externalId}.arena`,
      path,
      body: suggestion.sourceUrl || suggestion.arenaUrl,
      frontmatter: {
        arena_id: suggestion.id,
        type: suggestion.type,
        channel: suggestion.channelSlug,
        interest: suggestion.matchedInterest,
      },
      tags,
      wikilinks: [],
      source: "arena",
      external_id: externalId,
      image_url: suggestion.imageUrl,
      arena_url: suggestion.arenaUrl,
      synced_at: now,
      updated_at: now,
    });
    if (error) throw new Error(error.message);
  }

  // Link to other accepted nodes that share interest/channel tags
  const { data: peers } = await admin
    .from("vault_nodes")
    .select("id, tags, created_at")
    .eq("user_id", userId)
    .neq("id", nodeId)
    .order("created_at", { ascending: false })
    .limit(40);

  const tagSet = new Set(tags.map((t) => t.toLowerCase()));
  const edgeRows: {
    id: string;
    user_id: string;
    source_node_id: string;
    target_node_id: string;
    edge_type: "shared_interest" | "co_accepted";
    weight: number;
    metadata: Record<string, unknown>;
  }[] = [];

  for (const peer of peers ?? []) {
    const peerTags = ((peer.tags as string[]) ?? []).map((t) => t.toLowerCase());
    const shared = peerTags.filter((t) => tagSet.has(t) && t !== "arena");
    const [source, target] =
      nodeId < (peer.id as string)
        ? [nodeId, peer.id as string]
        : [peer.id as string, nodeId];

    if (shared.length >= 1) {
      edgeRows.push({
        id: randomUUID(),
        user_id: userId,
        source_node_id: source,
        target_node_id: target,
        edge_type: "shared_interest",
        weight: shared.length,
        metadata: { shared_tags: shared },
      });
    } else {
      // Still connect recently co-accepted pieces lightly
      edgeRows.push({
        id: randomUUID(),
        user_id: userId,
        source_node_id: source,
        target_node_id: target,
        edge_type: "co_accepted",
        weight: 0.5,
        metadata: { reason: "arena_ok" },
      });
    }
  }

  // Only keep co_accepted edges to a few recent peers to avoid a complete graph
  const sharedInterest = edgeRows.filter((e) => e.edge_type === "shared_interest");
  const coAccepted = edgeRows
    .filter((e) => e.edge_type === "co_accepted")
    .slice(0, 5);
  const toInsert = [...sharedInterest, ...coAccepted];

  if (toInsert.length > 0) {
    const { error: edgeError } = await admin.from("vault_edges").upsert(toInsert as never, {
      onConflict: "user_id,source_node_id,target_node_id,edge_type",
      ignoreDuplicates: true,
    });
    if (edgeError) {
      // Fallback: insert one-by-one ignoring duplicates
      for (const edge of toInsert) {
        await admin.from("vault_edges").upsert(edge as never, {
          onConflict: "user_id,source_node_id,target_node_id,edge_type",
          ignoreDuplicates: true,
        });
      }
    }
  }

  const [{ count: nodeCount }, { count: edgeCount }] = await Promise.all([
    admin
      .from("vault_nodes")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId),
    admin
      .from("vault_edges")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId),
  ]);

  return {
    node_id: nodeId,
    edges_created: toInsert.length,
    node_count: nodeCount ?? 0,
    edge_count: edgeCount ?? 0,
  };
}
