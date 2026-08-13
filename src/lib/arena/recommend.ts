export type ArenaSuggestion = {
  id: number;
  title: string;
  type: string;
  imageUrl: string | null;
  sourceUrl: string | null;
  arenaUrl: string;
  channelSlug: string;
  matchedInterest: string;
};

type ArenaBlock = {
  id: number;
  type?: string;
  title?: string | null;
  image?: {
    src?: string;
    medium?: { src?: string };
    large?: { src?: string };
    small?: { src?: string };
    square?: { src?: string };
  } | null;
  source?: { url?: string } | null;
};

/** Public Are.na channel slugs curated per interest slug (guest-readable). */
export const INTEREST_CHANNEL_MAP: Record<string, string[]> = {
  "minimalist-design": ["swiss-design", "minimal", "minimalism"],
  "lo-fi": ["lofi-beats", "lo-fi"],
  "editorial-photography": ["editorial", "editorial-photography", "photography"],
  "ambient-sound": ["sound"],
  typography: ["typefaces", "swiss-design"],
  brutalism: ["architecture", "swiss-design"],
  "film-stills": ["movie-stills"],
  collage: ["swiss-design", "editorial"],
  architecture: ["architecture", "swiss-design"],
  "street-style": ["street-style", "streetwear"],
  ceramics: ["swiss-design", "minimal"],
  jazz: ["jazz", "editorial"],
  "experimental-film": ["movie-stills", "editorial"],
  "product-design": ["swiss-design", "minimal"],
  watercolor: ["editorial", "swiss-design"],
  "zine-culture": ["editorial", "street-style"],
  "motion-graphics": ["swiss-design", "typefaces"],
  "analog-synth": ["sound", "lofi-beats"],
  "fashion-editorial": ["editorial", "street-style"],
  documentary: ["editorial", "photography"],
};

const FALLBACK_CHANNELS = ["arena-influences", "swiss-design", "editorial"];

const channelCache = new Map<
  string,
  { at: number; blocks: ArenaBlock[] }
>();
const CACHE_TTL_MS = 10 * 60 * 1000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pickImageUrl(block: ArenaBlock): string | null {
  return (
    block.image?.medium?.src ||
    block.image?.large?.src ||
    block.image?.square?.src ||
    block.image?.small?.src ||
    block.image?.src ||
    null
  );
}

async function fetchChannelContents(slug: string): Promise<ArenaBlock[]> {
  const cached = channelCache.get(slug);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.blocks;
  }

  const url = `https://api.are.na/v3/channels/${encodeURIComponent(slug)}/contents?per=24`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 600 },
  });

  if (res.status === 429) {
    await sleep(1500);
    const retry = await fetch(url, { headers: { Accept: "application/json" } });
    if (!retry.ok) return [];
    const json = (await retry.json()) as { data?: ArenaBlock[] };
    const blocks = json.data ?? [];
    channelCache.set(slug, { at: Date.now(), blocks });
    return blocks;
  }

  if (!res.ok) return [];
  const json = (await res.json()) as { data?: ArenaBlock[] };
  const blocks = json.data ?? [];
  channelCache.set(slug, { at: Date.now(), blocks });
  return blocks;
}

function channelsForInterests(interestSlugs: string[]): {
  slug: string;
  matchedInterest: string;
}[] {
  const out: { slug: string; matchedInterest: string }[] = [];
  const seen = new Set<string>();

  for (const interest of interestSlugs) {
    const mapped = INTEREST_CHANNEL_MAP[interest] ?? [];
    for (const channel of mapped) {
      if (seen.has(channel)) continue;
      seen.add(channel);
      out.push({ slug: channel, matchedInterest: interest });
    }
  }

  if (out.length === 0) {
    for (const channel of FALLBACK_CHANNELS) {
      out.push({ slug: channel, matchedInterest: "explore" });
    }
  }

  return out;
}

function toSuggestion(
  block: ArenaBlock,
  channelSlug: string,
  matchedInterest: string,
): ArenaSuggestion | null {
  const imageUrl = pickImageUrl(block);
  // Prefer visual pieces; allow Link/Embed that still have preview images
  if (!imageUrl && block.type !== "Image") return null;
  if (!imageUrl) return null;

  return {
    id: block.id,
    title: block.title?.trim() || `${block.type ?? "Block"} #${block.id}`,
    type: block.type ?? "Block",
    imageUrl,
    sourceUrl: block.source?.url ?? null,
    arenaUrl: `https://www.are.na/block/${block.id}`,
    channelSlug,
    matchedInterest,
  };
}

/**
 * Recommend up to `limit` Are.na content pieces from public channels
 * related to interests and optional focus-derived channels.
 */
export async function recommendArenaContent(
  interestSlugs: string[],
  limit = 10,
  extraChannels: string[] = [],
): Promise<ArenaSuggestion[]> {
  const channels = channelsForInterests(interestSlugs);

  // Prepend focus channels so they win first slots
  const seen = new Set(channels.map((c) => c.slug));
  const prioritized = [
    ...extraChannels
      .filter((slug) => {
        if (seen.has(slug)) return false;
        seen.add(slug);
        return true;
      })
      .map((slug) => ({ slug, matchedInterest: "focus" })),
    ...channels,
  ];

  const suggestions: ArenaSuggestion[] = [];
  const seenIds = new Set<number>();

  for (const channel of prioritized) {
    if (suggestions.length >= limit) break;
    const blocks = await fetchChannelContents(channel.slug);
    const ordered = [
      ...blocks.filter((b) => b.type === "Image"),
      ...blocks.filter((b) => b.type !== "Image"),
    ];

    for (const block of ordered) {
      if (suggestions.length >= limit) break;
      if (seenIds.has(block.id)) continue;
      const item = toSuggestion(block, channel.slug, channel.matchedInterest);
      if (!item) continue;
      seenIds.add(block.id);
      suggestions.push(item);
    }

    await sleep(120);
  }

  if (suggestions.length < limit) {
    for (const slug of FALLBACK_CHANNELS) {
      if (suggestions.length >= limit) break;
      const blocks = await fetchChannelContents(slug);
      for (const block of blocks) {
        if (suggestions.length >= limit) break;
        if (seenIds.has(block.id)) continue;
        const item = toSuggestion(block, slug, "explore");
        if (!item) continue;
        seenIds.add(block.id);
        suggestions.push(item);
      }
    }
  }

  return suggestions.slice(0, limit);
}
