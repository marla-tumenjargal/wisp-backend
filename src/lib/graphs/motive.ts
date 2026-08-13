export type AestheticColor = {
  name: string;
  hex: string;
};

/** Cached vision + motive analysis for stylish recommendations. */
export type AestheticBrief = {
  aesthetic_summary: string;
  mood: string[];
  colors: AestheticColor[];
  materials: string[];
  era_or_movement: string[];
  visual_keywords: string[];
  medium_affinities: string[];
  search_queries: string[];
  arena_channels: string[];
  font_direction: "serif" | "sans" | "display" | "mono" | "mixed";
  music_mood: string;
  similarity_notes: string;
  analyzed_at?: string;
};

export type GraphMotiveInput = {
  creating: string;
  theme?: string | null;
  goal?: string | null;
  similarities?: string | null;
};

/** Single string used for keyword parsing / display fallback. */
export function composeMotiveText(input: GraphMotiveInput): string {
  const parts = [
    input.creating.trim(),
    input.theme?.trim() ? `theme: ${input.theme.trim()}` : null,
    input.goal?.trim() ? `goal: ${input.goal.trim()}` : null,
    input.similarities?.trim()
      ? `similar to: ${input.similarities.trim()}`
      : null,
  ].filter(Boolean);
  return parts.join(". ");
}
