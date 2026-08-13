import type { BoardSuggestion } from "@/lib/suggestions/types";

const INTEREST_QUERIES: Record<string, string> = {
  "lo-fi": "lofi chill beats",
  "ambient-sound": "ambient soundscape",
  jazz: "contemporary jazz",
  "analog-synth": "analog synth electronic",
  "minimalist-design": "minimal piano",
  typography: "instrumental focus",
  "street-style": "alt r&b",
  "film-stills": "cinematic soundtrack",
  "experimental-film": "experimental electronic",
  documentary: "documentary score",
  "fashion-editorial": "runway electronic",
  "zine-culture": "indie pop",
};

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getClientToken(): Promise<string | null> {
  const id = process.env.SPOTIFY_CLIENT_ID;
  const secret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!id || !secret) return null;

  if (cachedToken && Date.now() < cachedToken.expiresAt - 30_000) {
    return cachedToken.value;
  }

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) return null;
  const json = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
  };
  if (!json.access_token) return null;

  cachedToken = {
    value: json.access_token,
    expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000,
  };
  return cachedToken.value;
}

type SpotifyTrack = {
  id: string;
  name: string;
  preview_url: string | null;
  external_urls?: { spotify?: string };
  album?: {
    images?: { url: string }[];
    name?: string;
  };
  artists?: { name: string }[];
};

async function searchTracks(
  token: string,
  query: string,
  limit: number,
): Promise<SpotifyTrack[]> {
  const url = new URL("https://api.spotify.com/v1/search");
  url.searchParams.set("q", query);
  url.searchParams.set("type", "track");
  url.searchParams.set("limit", String(limit));

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  const json = (await res.json()) as {
    tracks?: { items?: SpotifyTrack[] };
  };
  return json.tracks?.items ?? [];
}

export async function recommendSongs(
  interestSlugs: string[],
  limit = 4,
  focusQueries: string[] = [],
): Promise<BoardSuggestion[]> {
  const token = await getClientToken();
  if (!token) return [];

  const queries: { q: string; interest: string }[] = [];

  for (const q of focusQueries) {
    if (q.trim()) queries.push({ q: q.trim(), interest: "focus" });
  }

  for (const slug of interestSlugs) {
    const q = INTEREST_QUERIES[slug];
    if (q) queries.push({ q, interest: slug });
  }
  if (queries.length === 0) {
    queries.push({ q: "creative instrumental playlist", interest: "explore" });
  }

  const out: BoardSuggestion[] = [];
  const seen = new Set<string>();

  for (const { q, interest } of queries) {
    if (out.length >= limit) break;
    const tracks = await searchTracks(token, q, 6);
    for (const track of tracks) {
      if (out.length >= limit) break;
      if (!track.id || seen.has(track.id)) continue;
      seen.add(track.id);
      const artist = track.artists?.map((a) => a.name).join(", ") ?? "Unknown";
      const imageUrl = track.album?.images?.[0]?.url ?? null;
      out.push({
        id: `song:${track.id}`,
        kind: "song",
        title: track.name,
        subtitle: artist,
        imageUrl,
        sourceUrl: track.external_urls?.spotify ?? null,
        preview: track.preview_url,
        matchedInterest: interest,
        meta: {
          spotifyId: track.id,
          album: track.album?.name ?? null,
          previewUrl: track.preview_url,
        },
      });
    }
  }

  return out;
}
