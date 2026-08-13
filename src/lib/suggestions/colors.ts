import { COLOR_NAME_HEX } from "@/lib/graphs/focus";
import type { GraphFocusContext } from "@/lib/graphs/focus";
import type { BoardSuggestion } from "@/lib/suggestions/types";

type Palette = {
  id: string;
  name: string;
  swatches: string[];
  interests: string[];
};

const PALETTES: Palette[] = [
  {
    id: "klein-field",
    name: "Klein field",
    swatches: ["#002FA7", "#F4F4F2", "#0C0C0C", "#6B7C93"],
    interests: ["minimalist-design", "product-design", "typography"],
  },
  {
    id: "editorial-ink",
    name: "Editorial ink",
    swatches: ["#1A1A1A", "#E8E2D6", "#C45C26", "#5C6B4A"],
    interests: ["editorial-photography", "fashion-editorial", "zine-culture"],
  },
  {
    id: "lofi-dusk",
    name: "Lo-fi dusk",
    swatches: ["#2B1F3A", "#C47A6A", "#E8C9A0", "#5E7A8C"],
    interests: ["lo-fi", "ambient-sound", "analog-synth"],
  },
  {
    id: "brutal-concrete",
    name: "Brutal concrete",
    swatches: ["#8A8A82", "#2E2E2A", "#F0EDE6", "#B33A3A"],
    interests: ["brutalism", "architecture", "street-style"],
  },
  {
    id: "film-grain",
    name: "Film grain",
    swatches: ["#0F0F0F", "#D9C7A3", "#6E3B2E", "#3D5A4C"],
    interests: ["film-stills", "experimental-film", "documentary"],
  },
  {
    id: "watercolor-wash",
    name: "Watercolor wash",
    swatches: ["#E7F0F5", "#A8C5D4", "#F2C6B8", "#7A9E7E"],
    interests: ["watercolor", "ceramics", "collage"],
  },
  {
    id: "jazz-club",
    name: "Jazz club",
    swatches: ["#1C1210", "#C9A227", "#8B1E1E", "#EDE6D9"],
    interests: ["jazz", "analog-synth", "lo-fi"],
  },
  {
    id: "motion-neon",
    name: "Motion neon",
    swatches: ["#0A0A12", "#39FF14", "#FF2E63", "#08F7FE"],
    interests: ["motion-graphics", "street-style", "product-design"],
  },
  {
    id: "nature-canopy",
    name: "Nature canopy",
    swatches: ["#1B4332", "#40916C", "#95D5B2", "#F1FAEE"],
    interests: ["watercolor", "editorial-photography", "ceramics"],
  },
  {
    id: "citrus-grove",
    name: "Citrus grove",
    swatches: ["#E85D04", "#F48C06", "#2D6A4F", "#FFF8F0"],
    interests: ["fashion-editorial", "watercolor", "product-design"],
  },
];

function paletteFromColorName(
  name: string,
  focusLabel: string,
): BoardSuggestion {
  const swatches = COLOR_NAME_HEX[name] ?? COLOR_NAME_HEX.earth;
  return {
    id: `color:focus-${name}`,
    kind: "color",
    title: `${name} field`,
    subtitle: focusLabel,
    imageUrl: null,
    sourceUrl: null,
    preview: swatches[0] ?? "#000000",
    matchedInterest: name,
    meta: { swatches, fromFocus: true },
  };
}

function blendPalettes(
  names: string[],
  focusLabel: string,
): BoardSuggestion[] {
  if (names.length < 2) return [];
  const a = COLOR_NAME_HEX[names[0]];
  const b = COLOR_NAME_HEX[names[1]];
  if (!a || !b) return [];
  const swatches = [a[0], a[1], b[1], b[0]];
  return [
    {
      id: `color:blend-${names[0]}-${names[1]}`,
      kind: "color",
      title: `${names[0]} × ${names[1]}`,
      subtitle: focusLabel,
      imageUrl: null,
      sourceUrl: null,
      preview: swatches[0],
      matchedInterest: names[0],
      meta: { swatches, fromFocus: true },
    },
  ];
}

function paletteFromHexes(
  hexes: string[],
  label: string,
  id: string,
): BoardSuggestion | null {
  if (hexes.length === 0) return null;
  const swatches = [...hexes];
  while (swatches.length < 4) {
    swatches.push(swatches[swatches.length - 1] ?? "#0C0C0C");
  }
  return {
    id: `color:${id}`,
    kind: "color",
    title: "reference palette",
    subtitle: label,
    imageUrl: null,
    sourceUrl: null,
    preview: swatches[0],
    matchedInterest: "focus",
    meta: { swatches: swatches.slice(0, 4), fromFocus: true, fromReference: true },
  };
}

export function recommendColors(
  interestSlugs: string[],
  limit = 4,
  focus: GraphFocusContext | null = null,
): BoardSuggestion[] {
  const out: BoardSuggestion[] = [];
  const focusLabel =
    focus?.aestheticSummary?.slice(0, 80) ||
    focus?.creating ||
    focus?.focus ||
    "palette";

  if (focus?.colorHexes?.length) {
    const fromVision = paletteFromHexes(
      focus.colorHexes,
      focusLabel,
      "vision-ref",
    );
    if (fromVision) out.push(fromVision);
  }

  if (focus?.colorNames.length) {
    for (const name of focus.colorNames) {
      out.push(paletteFromColorName(name, focusLabel));
    }
    out.push(...blendPalettes(focus.colorNames, focusLabel));
  }

  // Nature keyword → canopy / citrus when orange also present
  if (focus?.keywords.some((k) => ["nature", "forest", "plant", "plants"].includes(k))) {
    const nature = PALETTES.find((p) => p.id === "nature-canopy");
    if (nature) {
      out.push({
        id: `color:${nature.id}`,
        kind: "color",
        title: nature.name,
        subtitle: focusLabel,
        imageUrl: null,
        sourceUrl: null,
        preview: nature.swatches[0],
        matchedInterest: "watercolor",
        meta: { swatches: nature.swatches, fromFocus: true },
      });
    }
    if (focus.colorNames.includes("orange")) {
      const citrus = PALETTES.find((p) => p.id === "citrus-grove");
      if (citrus) {
        out.push({
          id: `color:${citrus.id}`,
          kind: "color",
          title: citrus.name,
          subtitle: focusLabel,
          imageUrl: null,
          sourceUrl: null,
          preview: citrus.swatches[0],
          matchedInterest: "fashion-editorial",
          meta: { swatches: citrus.swatches, fromFocus: true },
        });
      }
    }
  }

  const interestSet = new Set(interestSlugs);
  const scored = PALETTES.map((palette) => {
    const hits = palette.interests.filter((i) => interestSet.has(i)).length;
    return { palette, hits };
  }).sort((a, b) => b.hits - a.hits || a.palette.name.localeCompare(b.palette.name));

  const picked =
    scored.filter((s) => s.hits > 0).length >= 1
      ? scored.filter((s) => s.hits > 0)
      : scored;

  for (const { palette } of picked) {
    if (out.some((o) => o.id === `color:${palette.id}`)) continue;
    out.push({
      id: `color:${palette.id}`,
      kind: "color",
      title: palette.name,
      subtitle: palette.swatches.join(" · "),
      imageUrl: null,
      sourceUrl: null,
      preview: palette.swatches[0] ?? "#000000",
      matchedInterest:
        palette.interests.find((i) => interestSet.has(i)) ?? palette.interests[0],
      meta: { swatches: palette.swatches },
    });
  }

  // Dedupe by id
  const seen = new Set<string>();
  return out
    .filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    })
    .slice(0, limit);
}
