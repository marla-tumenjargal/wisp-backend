import type { AestheticBrief } from "@/lib/graphs/motive";

export type GraphRecord = {
  id: string;
  user_id: string;
  name: string | null;
  description: string | null;
  /** Legacy combined text — kept in sync with motive */
  focus: string | null;
  creating: string | null;
  theme: string | null;
  goal: string | null;
  similarities: string | null;
  reference_image_url: string | null;
  aesthetic_brief: AestheticBrief | null;
  vault_name: string | null;
  vault_node_count: number;
  vault_edge_count: number;
  vault_synced_at: string | null;
  created_at: string;
  updated_at: string;
  node_count?: number;
  edge_count?: number;
};

export function displayGraphName(graph: {
  name: string | null;
  creating?: string | null;
  focus?: string | null;
}): string {
  const trimmed = graph.name?.trim();
  if (trimmed && trimmed.length > 0) return trimmed;
  const creating = graph.creating?.trim() || graph.focus?.trim();
  if (creating && creating.length > 0) {
    return creating.length > 42 ? `${creating.slice(0, 42)}…` : creating;
  }
  return "untitled";
}
