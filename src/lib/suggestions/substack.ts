import type { BoardSuggestion } from "@/lib/suggestions/types";

/** Curated publications when the user has not connected any yet. */
export const DEFAULT_SUBSTACK_PUBLICATIONS: {
  slug: string;
  interests: string[];
}[] = [
  { slug: "thecreativeindependent", interests: ["zine-culture", "typography", "documentary"] },
  { slug: "dirt", interests: ["street-style", "fashion-editorial", "zine-culture"] },
  { slug: "dense-discovery", interests: ["product-design", "minimalist-design", "typography"] },
  { slug: "whyisthisinteresting", interests: ["documentary", "zine-culture", "editorial-photography"] },
  { slug: "theatlantic", interests: ["documentary", "editorial-photography"] },
];

export function parsePublicationInput(raw: string): string | null {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return null;

  try {
    if (trimmed.includes("://") || trimmed.includes("substack.com")) {
      const withProto = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
      const url = new URL(withProto);
      const host = url.hostname.replace(/^www\./, "");
      if (host.endsWith(".substack.com")) {
        return host.replace(".substack.com", "");
      }
      // custom domain — keep hostname as publication handle for API path won't work;
      // Substack custom domains still expose {slug}.substack.com often via redirect.
      const match = host.match(/^([a-z0-9-]+)\.substack\.com$/);
      if (match) return match[1];
    }
  } catch {
    // fall through
  }

  const slug = trimmed
    .replace(/^@/, "")
    .replace(/\.substack\.com.*$/, "")
    .replace(/[^a-z0-9-]/g, "");
  return slug.length >= 2 ? slug : null;
}

type SubstackPost = {
  id: number;
  title?: string;
  subtitle?: string | null;
  slug?: string;
  post_date?: string;
  cover_image?: string | null;
  canonical_url?: string | null;
  description?: string | null;
};

async function fetchPublicationPosts(
  slug: string,
  limit = 6,
): Promise<SubstackPost[]> {
  const url = `https://${encodeURIComponent(slug)}.substack.com/api/v1/posts?limit=${limit}`;
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 600 },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as SubstackPost[] | { posts?: SubstackPost[] };
    if (Array.isArray(json)) return json;
    return json.posts ?? [];
  } catch {
    return [];
  }
}

/** Validate a publication exists by hitting the public posts API. */
export async function verifySubstackPublication(
  slug: string,
): Promise<{ ok: true; title?: string } | { ok: false; error: string }> {
  const url = `https://${encodeURIComponent(slug)}.substack.com/api/v1/posts?limit=1`;
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (res.status === 404) {
      return { ok: false, error: "Publication not found" };
    }
    if (!res.ok) {
      return { ok: false, error: `Substack returned ${res.status}` };
    }
    return { ok: true, title: slug };
  } catch {
    return { ok: false, error: "Could not reach Substack" };
  }
}

export async function recommendSubstack(
  interestSlugs: string[],
  connectedSlugs: string[],
  limit = 4,
): Promise<BoardSuggestion[]> {
  const interestSet = new Set(interestSlugs);
  const pubs: { slug: string; interest: string }[] = [];

  if (connectedSlugs.length > 0) {
    for (const slug of connectedSlugs) {
      pubs.push({
        slug,
        interest:
          interestSlugs[0] ??
          DEFAULT_SUBSTACK_PUBLICATIONS.find((p) => p.slug === slug)
            ?.interests[0] ??
          "explore",
      });
    }
  } else {
    for (const pub of DEFAULT_SUBSTACK_PUBLICATIONS) {
      const hit = pub.interests.find((i) => interestSet.has(i));
      if (hit || interestSlugs.length === 0) {
        pubs.push({ slug: pub.slug, interest: hit ?? pub.interests[0] });
      }
    }
    if (pubs.length === 0) {
      pubs.push(
        ...DEFAULT_SUBSTACK_PUBLICATIONS.slice(0, 3).map((p) => ({
          slug: p.slug,
          interest: p.interests[0],
        })),
      );
    }
  }

  const out: BoardSuggestion[] = [];
  const seen = new Set<number>();

  for (const pub of pubs) {
    if (out.length >= limit) break;
    const posts = await fetchPublicationPosts(pub.slug, 8);
    for (const post of posts) {
      if (out.length >= limit) break;
      if (!post.id || seen.has(post.id)) continue;
      if (!post.title?.trim()) continue;
      seen.add(post.id);
      const url =
        post.canonical_url ||
        `https://${pub.slug}.substack.com/p/${post.slug ?? post.id}`;
      out.push({
        id: `substack:${post.id}`,
        kind: "substack",
        title: post.title.trim(),
        subtitle: post.subtitle?.trim() || pub.slug,
        imageUrl: post.cover_image ?? null,
        sourceUrl: url,
        preview: pub.slug,
        matchedInterest: pub.interest,
        meta: {
          publication: pub.slug,
          postId: post.id,
          postDate: post.post_date ?? null,
        },
      });
    }
  }

  return out;
}
