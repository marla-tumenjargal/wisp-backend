export type SuggestionKind =
  | "arena"
  | "font"
  | "color"
  | "song"
  | "substack";

/** Unified board card — all sources share this shape. */
export type BoardSuggestion = {
  id: string;
  kind: SuggestionKind;
  title: string;
  subtitle: string | null;
  imageUrl: string | null;
  sourceUrl: string | null;
  /** Font family, hex color, etc. */
  preview: string | null;
  matchedInterest: string;
  /** Source-specific payload (kept for accept / display). */
  meta: Record<string, unknown>;
};

export type AcceptResult = {
  node_id: string;
  edges_created: number;
  node_count: number;
  edge_count: number;
};
