/**
 * Cross-medium concept bridges.
 * If a user is designing X, these concepts justify recommending Y.
 */
export const CONCEPT_BRIDGES: Record<string, string[]> = {
  music: [
    "music-as-structure",
    "audio-reactive",
    "visual-discovery",
    "pacing",
    "iconography",
  ],
  discovery: ["visual-discovery", "non-linear", "spatial-nav", "zoom-as-nav"],
  app: ["spatial-nav", "hierarchy", "direct-manipulation", "product-voice"],
  ux: ["spatial-nav", "hierarchy", "circulation", "pacing", "state-as-motion"],
  ui: ["hierarchy", "reduction", "direct-manipulation", "product-voice"],
  typography: ["kinetic-type", "dense-type", "letterform", "published-feel"],
  editorial: ["dense-type", "asymmetric-layout", "pacing", "published-feel"],
  motion: ["kinetic-type", "state-as-motion", "audio-reactive", "idle-motion"],
  film: ["kinetic-type", "atmosphere", "color-mood", "pacing", "world-building"],
  architecture: ["spatial-nav", "circulation", "void", "reduction"],
  photography: ["color-mood", "intimacy", "found-composition"],
  fashion: ["pacing", "attitude", "asymmetric-layout", "sequence"],
  "creative coding": ["generative-form", "variable-systems", "audio-reactive"],
  generative: ["generative-form", "variable-systems"],
  navigation: ["spatial-nav", "circulation", "color-as-nav", "state-as-motion"],
  visualization: ["information-as-space", "audio-reactive", "color-mood"],
};

export function conceptsForText(text: string): string[] {
  const lower = text.toLowerCase();
  const found = new Set<string>();
  for (const [needle, concepts] of Object.entries(CONCEPT_BRIDGES)) {
    if (lower.includes(needle)) {
      for (const c of concepts) found.add(c);
    }
  }
  return [...found];
}
