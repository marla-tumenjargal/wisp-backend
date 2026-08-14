"use server";

import { createClient } from "@/lib/supabase/server";
import { generateDiscoverFeed } from "@/lib/recsys/pipeline";
import { isMissingRelation } from "@/lib/recsys/store";
import type { InteractionType } from "@/lib/recsys/types";
import { INTERACTION_TAG_DELTAS } from "@/lib/recsys/weights";

export type InteractResult =
  | { ok: true; saved?: boolean; inProject?: boolean }
  | { ok: false; error: string };

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function recordInteraction(input: {
  itemId: string;
  type: InteractionType;
  projectId?: string | null;
  tags?: string[];
}): Promise<InteractResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Sign in to continue." };

  const { error } = await supabase.from("user_interactions").insert({
    user_id: user.id,
    item_id: input.itemId,
    project_id: input.projectId ?? null,
    interaction_type: input.type,
  });

  if (error && !isMissingRelation(error.message)) {
    return { ok: false, error: error.message };
  }

  await applyTagWeights(supabase, user.id, input.tags ?? [], input.type);

  if (input.type === "save") {
    const { error: saveError } = await supabase.from("user_saved_items").upsert({
      user_id: user.id,
      item_id: input.itemId,
    });
    if (saveError && !isMissingRelation(saveError.message)) {
      return { ok: false, error: saveError.message };
    }
    return { ok: true, saved: true };
  }

  if (input.type === "unsave") {
    await supabase
      .from("user_saved_items")
      .delete()
      .eq("user_id", user.id)
      .eq("item_id", input.itemId);
    return { ok: true, saved: false };
  }

  if (input.type === "add_to_project") {
    if (!input.projectId) {
      return { ok: false, error: "Choose a project first." };
    }
    const { error: refError } = await supabase.from("project_references").upsert({
      project_id: input.projectId,
      item_id: input.itemId,
      user_id: user.id,
    });
    if (refError && !isMissingRelation(refError.message)) {
      return { ok: false, error: refError.message };
    }
    await supabase.from("user_saved_items").upsert({
      user_id: user.id,
      item_id: input.itemId,
    });
    return { ok: true, inProject: true, saved: true };
  }

  if (input.type === "dismiss") {
    await supabase
      .from("user_recommendation_feed")
      .delete()
      .eq("user_id", user.id)
      .eq("item_id", input.itemId);
  }

  return { ok: true };
}

async function applyTagWeights(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  tags: string[],
  type: InteractionType,
) {
  const delta = INTERACTION_TAG_DELTAS[type] ?? 0;
  if (!delta || tags.length === 0) return;

  const { data } = await supabase
    .from("user_tag_weights")
    .select("tag, weight")
    .eq("user_id", userId)
    .in(
      "tag",
      tags.map((t) => t.toLowerCase()),
    );

  const current = new Map(
    (data ?? []).map((r) => [String(r.tag).toLowerCase(), Number(r.weight) || 0]),
  );

  const rows = tags.map((tag) => {
    const key = tag.toLowerCase();
    const next = Math.max(-1, Math.min(1, (current.get(key) ?? 0) + delta));
    return {
      user_id: userId,
      tag: key,
      weight: next,
      updated_at: new Date().toISOString(),
    };
  });

  await supabase.from("user_tag_weights").upsert(rows, {
    onConflict: "user_id,tag",
  });
}

export async function refreshDiscoverFeed(projectId?: string | null) {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false as const, error: "Sign in to continue." };
  const feed = await generateDiscoverFeed(supabase, user.id, {
    projectId,
    force: true,
  });
  return { ok: true as const, feed };
}
