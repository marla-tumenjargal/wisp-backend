import { recommendArenaContent } from "@/lib/arena/recommend";
import type { GraphFocusContext } from "@/lib/graphs/focus";
import { mergeFocusInterests } from "@/lib/graphs/focus";
import { recommendColors } from "@/lib/suggestions/colors";
import { recommendFonts } from "@/lib/suggestions/fonts";
import { recommendSongs } from "@/lib/suggestions/songs";
import { recommendSubstack } from "@/lib/suggestions/substack";
import type { BoardSuggestion } from "@/lib/suggestions/types";

function arenaToBoard(
  items: Awaited<ReturnType<typeof recommendArenaContent>>,
): BoardSuggestion[] {
  return items.map((item) => ({
    id: `arena:${item.id}`,
    kind: "arena" as const,
    title: item.title,
    subtitle: item.channelSlug,
    imageUrl: item.imageUrl,
    sourceUrl: item.arenaUrl,
    preview: null,
    matchedInterest: item.matchedInterest,
    meta: {
      arenaId: item.id,
      type: item.type,
      channelSlug: item.channelSlug,
      sourceUrl: item.sourceUrl,
      arenaUrl: item.arenaUrl,
    },
  }));
}

/**
 * Mix Are.na, fonts, colors, songs, and Substack onto one board,
 * biased by the graph's focus when present.
 */
export async function recommendBoardSuggestions(
  userInterestSlugs: string[],
  options: {
    substackPublications?: string[];
    focus?: GraphFocusContext | null;
  } = {},
): Promise<BoardSuggestion[]> {
  const pubs = options.substackPublications ?? [];
  const focus = options.focus ?? null;
  const interestSlugs = mergeFocusInterests(focus, userInterestSlugs);

  const fonts = recommendFonts(interestSlugs, 4, focus);
  const colors = recommendColors(interestSlugs, 4, focus);

  // Prefer music mood from aesthetic brief when present
  const songQueries = [
    ...(focus?.musicMood ? [focus.musicMood] : []),
    ...(focus?.searchQueries ?? []),
  ];

  const [arena, songs, substack] = await Promise.all([
    recommendArenaContent(
      interestSlugs,
      8,
      focus?.arenaChannels ?? [],
    ).catch(() => []),
    recommendSongs(interestSlugs, 4, songQueries).catch(() => []),
    recommendSubstack(interestSlugs, pubs, 4).catch(() => []),
  ]);

  // Soft-rank Are.na by visual keyword overlap when we have a reference aesthetic
  const arenaBoard = arenaToBoard(arena);
  const rankedArena =
    focus?.visualKeywords.length && focus.hasReferenceImage
      ? [...arenaBoard].sort((a, b) => {
          const score = (item: BoardSuggestion) => {
            const hay = `${item.title} ${item.subtitle ?? ""}`.toLowerCase();
            return focus.visualKeywords.reduce(
              (n, kw) => n + (hay.includes(kw.toLowerCase()) ? 1 : 0),
              0,
            );
          };
          return score(b) - score(a);
        })
      : arenaBoard;

  // Reference lookalike hint card
  const referenceCards: BoardSuggestion[] = [];
  if (focus?.hasReferenceImage && focus.aestheticSummary) {
    referenceCards.push({
      id: `reference:brief`,
      kind: "arena",
      title: "your reference",
      subtitle: focus.creating,
      imageUrl: focus.referenceImageUrl,
      sourceUrl: focus.referenceImageUrl,
      preview: null,
      matchedInterest: "focus",
      meta: {
        type: "Reference",
        channelSlug: "reference",
        aestheticSummary: focus.aestheticSummary,
        similarity: focus.similarities,
        isReferenceBrief: true,
      },
    });
  }

  const mixed: BoardSuggestion[] = [
    ...referenceCards,
    ...rankedArena,
    ...fonts,
    ...colors,
    ...songs,
    ...substack,
  ];

  return mixed.sort((a, b) => {
    // Keep reference brief near top after stable shuffle of others
    if (a.meta?.isReferenceBrief) return -1;
    if (b.meta?.isReferenceBrief) return 1;
    return hash(a.id) - hash(b.id);
  });
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}
