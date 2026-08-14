import type { SupabaseClient } from "@supabase/supabase-js";
import { composeMotiveText } from "@/lib/graphs/motive";
import type { AestheticBrief } from "@/lib/graphs/motive";
import type { GraphRecord } from "@/lib/graphs/types";

export const GRAPH_SELECT =
  "id, user_id, name, description, focus, creating, theme, goal, similarities, reference_image_url, aesthetic_brief, vault_name, vault_node_count, vault_edge_count, vault_synced_at, created_at, updated_at";

export async function listGraphs(
  supabase: SupabaseClient,
  userId: string,
): Promise<GraphRecord[]> {
  const { data, error } = await supabase
    .from("graphs")
    .select(GRAPH_SELECT)
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as GraphRecord[];
}

export async function getGraph(
  supabase: SupabaseClient,
  userId: string,
  graphId: string,
): Promise<GraphRecord | null> {
  const { data, error } = await supabase
    .from("graphs")
    .select(GRAPH_SELECT)
    .eq("user_id", userId)
    .eq("id", graphId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as GraphRecord | null) ?? null;
}

export async function createGraph(
  supabase: SupabaseClient,
  userId: string,
  input: {
    name?: string | null;
    description?: string | null;
    creating: string;
    theme?: string | null;
    goal?: string | null;
    similarities?: string | null;
    focus_areas?: string[] | null;
    reference_image_url?: string | null;
    aesthetic_brief?: AestheticBrief | null;
  },
): Promise<GraphRecord> {
  const creating = input.creating.trim();
  const theme = input.theme?.trim() || null;
  const goal = input.goal?.trim() || null;
  const similarities = input.similarities?.trim() || null;
  const focus = composeMotiveText({ creating, theme, goal, similarities });
  const name = input.name?.trim() || null;
  const description = input.description?.trim() || null;

  const { data, error } = await supabase
    .from("graphs")
    .insert({
      user_id: userId,
      name,
      description,
      focus,
      creating,
      theme,
      goal,
      similarities,
      reference_image_url: input.reference_image_url ?? null,
      aesthetic_brief: input.aesthetic_brief ?? null,
      ...(input.focus_areas ? { focus_areas: input.focus_areas } : {}),
    })
    .select(GRAPH_SELECT)
    .single();

  if (error) throw new Error(error.message);
  return data as GraphRecord;
}

export async function touchGraph(
  supabase: SupabaseClient,
  graphId: string,
): Promise<void> {
  await supabase
    .from("graphs")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", graphId);
}

export async function assertGraphOwner(
  supabase: SupabaseClient,
  userId: string,
  graphId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("graphs")
    .select("id")
    .eq("id", graphId)
    .eq("user_id", userId)
    .maybeSingle();
  return Boolean(data?.id);
}
