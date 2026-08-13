import type { GraphFocusContext } from "@/lib/graphs/focus";
import type { BoardSuggestion } from "@/lib/suggestions/types";

type FontEntry = {
  id: string;
  family: string;
  category: string;
  interests: string[];
  sample: string;
};

const FONT_CATALOG: FontEntry[] = [
  {
    id: "syne",
    family: "Syne",
    category: "display",
    interests: ["typography", "minimalist-design", "brutalism", "product-design"],
    sample: "Aa Bb Cc",
  },
  {
    id: "dm-serif-display",
    family: "DM Serif Display",
    category: "serif",
    interests: ["editorial-photography", "fashion-editorial", "zine-culture"],
    sample: "Edit / Draft",
  },
  {
    id: "space-grotesk",
    family: "Space Grotesk",
    category: "sans",
    interests: ["brutalism", "product-design", "motion-graphics"],
    sample: "SYSTEM",
  },
  {
    id: "instrument-serif",
    family: "Instrument Serif",
    category: "serif",
    interests: ["typography", "architecture", "ceramics"],
    sample: "soft form",
  },
  {
    id: "jetbrains-mono",
    family: "JetBrains Mono",
    category: "mono",
    interests: ["minimalist-design", "product-design", "motion-graphics"],
    sample: "const wisp = 1",
  },
  {
    id: "playfair-display",
    family: "Playfair Display",
    category: "serif",
    interests: ["fashion-editorial", "editorial-photography", "film-stills"],
    sample: "Atelier",
  },
  {
    id: "archivo-black",
    family: "Archivo Black",
    category: "display",
    interests: ["brutalism", "street-style", "zine-culture"],
    sample: "LOUD",
  },
  {
    id: "fraunces",
    family: "Fraunces",
    category: "serif",
    interests: ["watercolor", "ceramics", "collage"],
    sample: "handmade",
  },
  {
    id: "ibm-plex-sans",
    family: "IBM Plex Sans",
    category: "sans",
    interests: ["minimalist-design", "architecture", "product-design"],
    sample: "Clarity",
  },
  {
    id: "bebas-neue",
    family: "Bebas Neue",
    category: "display",
    interests: ["street-style", "film-stills", "motion-graphics"],
    sample: "TITLE CARD",
  },
  {
    id: "libre-baskerville",
    family: "Libre Baskerville",
    category: "serif",
    interests: ["documentary", "zine-culture", "editorial-photography"],
    sample: "long form",
  },
  {
    id: "outfit",
    family: "Outfit",
    category: "sans",
    interests: ["product-design", "minimalist-design", "typography"],
    sample: "interface",
  },
];

export function recommendFonts(
  interestSlugs: string[],
  limit = 4,
  focus: GraphFocusContext | null = null,
): BoardSuggestion[] {
  const interestSet = new Set(interestSlugs);
  const direction = focus?.fontDirection;

  const scored = FONT_CATALOG.map((font) => {
    let hits = font.interests.filter((i) => interestSet.has(i)).length;
    if (direction && direction !== "mixed") {
      if (font.category === direction) hits += 3;
      if (direction === "display" && font.category === "display") hits += 1;
    }
    if (focus?.visualKeywords.some((k) =>
      font.family.toLowerCase().includes(k.toLowerCase()),
    )) {
      hits += 1;
    }
    return { font, hits };
  }).sort((a, b) => b.hits - a.hits || a.font.family.localeCompare(b.font.family));

  const picked =
    scored.filter((s) => s.hits > 0).length >= 2
      ? scored.filter((s) => s.hits > 0)
      : scored;

  return picked.slice(0, limit).map(({ font, hits }) => ({
    id: `font:${font.id}`,
    kind: "font" as const,
    title: font.family,
    subtitle: font.category,
    imageUrl: null,
    sourceUrl: `https://fonts.google.com/specimen/${encodeURIComponent(font.family.replace(/ /g, "+"))}`,
    preview: font.family,
    matchedInterest: font.interests.find((i) => interestSet.has(i)) ?? font.interests[0],
    meta: {
      family: font.family,
      category: font.category,
      sample: font.sample,
      googleCss: `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font.family).replace(/%20/g, "+")}:wght@400;600;700&display=swap`,
      score: hits,
    },
  }));
}
