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
  "you",
  "your",
  "that",
  "this",
  "as",
  "is",
  "are",
  "be",
  "from",
  "into",
  "via",
  "not",
  "new",
  "app",
  "apps",
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !STOP.has(t));
}

export function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

export function jaccard(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setA = new Set(a.map((x) => x.toLowerCase()));
  const setB = new Set(b.map((x) => x.toLowerCase()));
  let inter = 0;
  for (const x of setA) if (setB.has(x)) inter += 1;
  const union = setA.size + setB.size - inter;
  return union === 0 ? 0 : inter / union;
}

export function overlap(a: string[], b: string[]): string[] {
  const setB = new Set(b.map((x) => x.toLowerCase()));
  return a.filter((x) => setB.has(x.toLowerCase()));
}

/** Sparse bag-of-words cosine — stand-in until embeddings exist. */
export function cosineBag(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const fa = counts(a);
  const fb = counts(b);
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (const [, v] of fa) na += v * v;
  for (const [, v] of fb) nb += v * v;
  for (const [k, v] of fa) {
    const u = fb.get(k);
    if (u) dot += v * u;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function counts(tokens: string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const t of tokens) {
    const k = t.toLowerCase();
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

export function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}
