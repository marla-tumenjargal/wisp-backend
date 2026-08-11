import matter from "gray-matter";
import path from "node:path";

export type ParsedNote = {
  title: string;
  filename: string;
  path: string;
  body: string;
  frontmatter: Record<string, unknown>;
  tags: string[];
  wikilinks: string[];
};

const WIKILINK_RE = /\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]/g;
const TAG_RE = /(?:^|[\s(,[{])#([A-Za-z0-9_/-]+)/g;

function normalizeTag(raw: string): string {
  return raw.replace(/^#/, "").trim().toLowerCase();
}

function tagsFromFrontmatter(data: Record<string, unknown>): string[] {
  const value = data.tags ?? data.tag;
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => String(item).split(/[,\s]+/))
      .map(normalizeTag)
      .filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/[,\s]+/)
      .map(normalizeTag)
      .filter(Boolean);
  }
  return [];
}

function tagsFromBody(body: string): string[] {
  const tags: string[] = [];
  TAG_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = TAG_RE.exec(body)) !== null) {
    tags.push(normalizeTag(match[1]));
  }
  return tags;
}

function extractWikilinks(body: string): string[] {
  const links: string[] = [];
  WIKILINK_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = WIKILINK_RE.exec(body)) !== null) {
    const target = match[1].trim();
    if (target) links.push(target);
  }
  return [...new Set(links)];
}

export function parseMarkdownNote(
  relativePath: string,
  raw: string,
): ParsedNote {
  const { data, content } = matter(raw);
  const frontmatter = (data ?? {}) as Record<string, unknown>;
  const filename = path.basename(relativePath);
  const stem = filename.replace(/\.md$/i, "");
  const title =
    typeof frontmatter.title === "string" && frontmatter.title.trim()
      ? frontmatter.title.trim()
      : stem;

  const tags = [
    ...new Set([...tagsFromFrontmatter(frontmatter), ...tagsFromBody(content)]),
  ];

  return {
    title,
    filename,
    path: relativePath.replace(/\\/g, "/"),
    body: content.trim(),
    frontmatter,
    tags,
    wikilinks: extractWikilinks(content),
  };
}

export function normalizeLinkKey(value: string): string {
  return value
    .trim()
    .replace(/\.md$/i, "")
    .replace(/\\/g, "/")
    .toLowerCase();
}
