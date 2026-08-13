import type { AestheticBrief, GraphMotiveInput } from "@/lib/graphs/motive";
import { composeMotiveText } from "@/lib/graphs/motive";
import { INTEREST_CATALOG } from "@/lib/onboarding/interests";

export type GraphFocusContext = {
  /** Combined motive text for display / tags */
  focus: string;
  creating: string;
  theme: string | null;
  goal: string | null;
  similarities: string | null;
  interestSlugs: string[];
  keywords: string[];
  colorNames: string[];
  /** Hex swatches from vision when available */
  colorHexes: string[];
  searchQueries: string[];
  arenaChannels: string[];
  fontDirection: AestheticBrief["font_direction"] | null;
  musicMood: string | null;
  aestheticSummary: string | null;
  visualKeywords: string[];
  hasReferenceImage: boolean;
  referenceImageUrl: string | null;
};

const STOP = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "of",
  "for",
  "to",
  "in",
  "on",
  "with",
  "my",
  "me",
  "i",
  "want",
  "need",
  "just",
  "about",
  "board",
  "graph",
  "theme",
  "goal",
  "vibes",
  "vibe",
  "mood",
  "focus",
  "this",
  "that",
  "like",
  "some",
  "ideas",
  "stuff",
  "creating",
  "create",
  "similar",
  "similarity",
]);

/** Named colors → hex anchors for generated palettes */
export const COLOR_NAME_HEX: Record<string, string[]> = {
  orange: ["#E85D04", "#F48C06", "#FAA307", "#370617"],
  red: ["#9B2226", "#AE2012", "#BB3E03", "#E9D8A6"],
  blue: ["#002FA7", "#023E8A", "#0077B6", "#CAF0F8"],
  green: ["#1B4332", "#2D6A4F", "#40916C", "#D8F3DC"],
  yellow: ["#FFB703", "#FB8500", "#023047", "#8ECAE6"],
  purple: ["#3C096C", "#5A189A", "#7B2CBF", "#E0AAFF"],
  pink: ["#FF0A54", "#FF477E", "#FF85A1", "#FFF0F3"],
  teal: ["#006D77", "#83C5BE", "#EDF6F9", "#E29578"],
  brown: ["#5C4033", "#A67B5B", "#D2B48C", "#F5F0E6"],
  black: ["#0C0C0C", "#1A1A1A", "#4A4A4A", "#F4F4F2"],
  white: ["#FFFFFF", "#F4F4F2", "#E8E4DC", "#0C0C0C"],
  cream: ["#F5F0E6", "#EDE6D9", "#C4A484", "#3D2C1E"],
  gold: ["#C9A227", "#E8D5A3", "#1C1210", "#8B1E1E"],
  earth: ["#5C4033", "#A3B18A", "#DAD7CD", "#344E41"],
};

const KEYWORD_CHANNELS: Record<string, string[]> = {
  orange: ["color", "orange"],
  nature: ["nature", "landscape", "plants"],
  plant: ["plants", "nature"],
  plants: ["plants", "nature"],
  forest: ["nature", "landscape"],
  landscape: ["landscape", "nature"],
  ocean: ["ocean", "water"],
  water: ["water", "ocean"],
  sky: ["sky", "clouds"],
  flower: ["flowers", "plants"],
  flowers: ["flowers", "plants"],
  color: ["color", "colour"],
  colour: ["color", "colour"],
  typography: ["typefaces", "swiss-design"],
  type: ["typefaces"],
  font: ["typefaces"],
  architecture: ["architecture"],
  brutal: ["architecture", "swiss-design"],
  film: ["movie-stills"],
  photo: ["photography", "editorial"],
  photography: ["photography", "editorial"],
  fashion: ["street-style", "editorial"],
  music: ["sound", "lofi-beats"],
  jazz: ["jazz"],
  "lo-fi": ["lofi-beats"],
  lofi: ["lofi-beats"],
  ambient: ["sound"],
  collage: ["editorial", "swiss-design"],
  ceramic: ["minimal", "swiss-design"],
  watercolor: ["editorial"],
  zine: ["editorial", "street-style"],
  street: ["street-style", "streetwear"],
  minimal: ["minimal", "minimalism"],
  swiss: ["swiss-design"],
  editorial: ["editorial", "swiss-design"],
  poster: ["swiss-design", "typefaces"],
  branding: ["swiss-design", "minimal"],
  packaging: ["minimal", "swiss-design"],
};

const KEYWORD_INTEREST: Record<string, string> = {
  nature: "watercolor",
  plant: "watercolor",
  plants: "ceramics",
  forest: "watercolor",
  landscape: "editorial-photography",
  orange: "fashion-editorial",
  color: "typography",
  colour: "typography",
  typography: "typography",
  type: "typography",
  font: "typography",
  architecture: "architecture",
  brutal: "brutalism",
  brutalism: "brutalism",
  film: "film-stills",
  photo: "editorial-photography",
  photography: "editorial-photography",
  fashion: "fashion-editorial",
  jazz: "jazz",
  lofi: "lo-fi",
  "lo-fi": "lo-fi",
  ambient: "ambient-sound",
  synth: "analog-synth",
  collage: "collage",
  ceramic: "ceramics",
  ceramics: "ceramics",
  watercolor: "watercolor",
  zine: "zine-culture",
  street: "street-style",
  minimal: "minimalist-design",
  product: "product-design",
  motion: "motion-graphics",
  documentary: "documentary",
  editorial: "editorial-photography",
  poster: "typography",
  branding: "product-design",
  packaging: "product-design",
};

const MEDIUM_TO_INTEREST: Record<string, string> = {
  photography: "editorial-photography",
  typography: "typography",
  editorial: "editorial-photography",
  film: "film-stills",
  music: "ambient-sound",
  fashion: "fashion-editorial",
  architecture: "architecture",
  collage: "collage",
  design: "minimalist-design",
  product: "product-design",
};

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !STOP.has(t));
}

function absorbText(
  text: string,
  interestSlugs: Set<string>,
  colorNames: string[],
  arenaChannels: Set<string>,
  searchQueries: string[],
  keywords: string[],
) {
  const tokens = tokenize(text);
  keywords.push(...tokens);

  for (const interest of INTEREST_CATALOG) {
    if (
      text.toLowerCase().includes(interest.label) ||
      text.toLowerCase().includes(interest.slug.replace(/-/g, " "))
    ) {
      interestSlugs.add(interest.slug);
    }
  }

  for (const token of tokens) {
    if (COLOR_NAME_HEX[token]) colorNames.push(token);
    const interest = KEYWORD_INTEREST[token];
    if (interest) interestSlugs.add(interest);
    const channels = KEYWORD_CHANNELS[token];
    if (channels) for (const c of channels) arenaChannels.add(c);
  }

  if (/\bnature\b/i.test(text)) {
    interestSlugs.add("watercolor");
    interestSlugs.add("editorial-photography");
    arenaChannels.add("nature");
    arenaChannels.add("landscape");
    searchQueries.push("nature ambient", "editorial landscape photography");
  }
}

/**
 * Build recommendation drivers from creative motive + optional vision brief.
 */
export function interpretMotive(options: {
  motive: GraphMotiveInput | null;
  /** Legacy single-field focus */
  focus?: string | null;
  brief?: AestheticBrief | null;
  hasReferenceImage?: boolean;
  referenceImageUrl?: string | null;
}): GraphFocusContext | null {
  const creating =
    options.motive?.creating?.trim() ||
    options.focus?.trim() ||
    "";
  if (!creating && !options.brief) return null;

  const theme = options.motive?.theme?.trim() || null;
  const goal = options.motive?.goal?.trim() || null;
  const similarities = options.motive?.similarities?.trim() || null;

  const motive: GraphMotiveInput = {
    creating: creating || options.brief?.aesthetic_summary || "inspiration board",
    theme,
    goal,
    similarities,
  };

  const focus = composeMotiveText(motive);
  const interestSlugs = new Set<string>();
  const colorNames: string[] = [];
  const colorHexes: string[] = [];
  const arenaChannels = new Set<string>();
  const searchQueries: string[] = [];
  const keywords: string[] = [];

  absorbText(focus, interestSlugs, colorNames, arenaChannels, searchQueries, keywords);
  searchQueries.push(focus);

  const brief = options.brief;
  if (brief) {
    if (brief.aesthetic_summary) searchQueries.push(brief.aesthetic_summary);
    for (const q of brief.search_queries) searchQueries.push(q);
    if (brief.music_mood) searchQueries.push(brief.music_mood);
    for (const c of brief.arena_channels) arenaChannels.add(c);
    for (const kw of brief.visual_keywords) {
      keywords.push(...tokenize(kw));
      absorbText(kw, interestSlugs, colorNames, arenaChannels, searchQueries, keywords);
    }
    for (const mood of brief.mood) {
      searchQueries.push(`${mood} aesthetic soundtrack`);
    }
    for (const medium of brief.medium_affinities) {
      const mapped = MEDIUM_TO_INTEREST[medium.toLowerCase()];
      if (mapped) interestSlugs.add(mapped);
    }
    for (const color of brief.colors) {
      colorNames.push(color.name.toLowerCase());
      if (color.hex) colorHexes.push(color.hex);
    }
  }

  const themeWords = [...new Set(keywords)]
    .filter((k) => !STOP.has(k))
    .slice(0, 5)
    .join(" ");
  if (themeWords) searchQueries.push(`${themeWords} editorial inspiration`);

  return {
    focus,
    creating: motive.creating,
    theme,
    goal,
    similarities,
    interestSlugs: [...interestSlugs],
    keywords: [...new Set(keywords)],
    colorNames: [...new Set(colorNames)],
    colorHexes: [...new Set(colorHexes)].slice(0, 8),
    searchQueries: [...new Set(searchQueries)].slice(0, 8),
    arenaChannels: [...arenaChannels],
    fontDirection: brief?.font_direction ?? null,
    musicMood: brief?.music_mood ?? null,
    aestheticSummary: brief?.aesthetic_summary ?? null,
    visualKeywords: brief?.visual_keywords ?? [],
    hasReferenceImage: Boolean(
      options.hasReferenceImage || options.referenceImageUrl,
    ),
    referenceImageUrl: options.referenceImageUrl ?? null,
  };
}

/** @deprecated use interpretMotive */
export function interpretFocus(
  focusRaw: string | null | undefined,
): GraphFocusContext | null {
  return interpretMotive({ motive: null, focus: focusRaw });
}

export function mergeFocusInterests(
  focus: GraphFocusContext | null,
  userInterestSlugs: string[],
): string[] {
  if (!focus) return userInterestSlugs;
  if (focus.interestSlugs.length > 0) {
    const merged = [...focus.interestSlugs];
    for (const slug of userInterestSlugs) {
      if (!merged.includes(slug) && merged.length < 6) merged.push(slug);
    }
    return merged;
  }
  return userInterestSlugs.length > 0 ? userInterestSlugs : ["explore"];
}
