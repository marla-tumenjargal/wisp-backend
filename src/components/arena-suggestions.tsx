"use client";

import { useState } from "react";
import type { ArenaSuggestion } from "@/lib/arena/recommend";

export function ArenaSuggestions() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ArenaSuggestion[]>([]);
  const [basedOn, setBasedOn] = useState<string[]>([]);

  async function loadSuggestions() {
    setOpen(true);
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/arena/suggestions");
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error || `Request failed (${res.status})`);
      }
      setItems(body.suggestions ?? []);
      setBasedOn(body.based_on ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load suggestions");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-md border border-ink/10 bg-white/70 p-5 backdrop-blur-sm">
      <p className="text-sm font-medium tracking-[0.08em] text-klein lowercase">
        are.na
      </p>
      <h3 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-[-0.02em] text-ink">
        visual suggestions
      </h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-ink/60">
        Pull 10 image and content pieces from Are.na channels matched to your
        interests.
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={loading}
          onClick={() => void loadSuggestions()}
          className="inline-flex h-11 items-center justify-center rounded-md bg-ink px-5 text-sm font-medium text-paper transition-[opacity,transform] hover:opacity-90 active:scale-[0.98] disabled:cursor-wait disabled:opacity-60"
        >
          {loading
            ? "Finding pieces…"
            : open
              ? "Refresh suggestions"
              : "View Are.na suggestions"}
        </button>
        {open && !loading ? (
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-sm text-ink/50 underline-offset-4 hover:underline"
          >
            Hide
          </button>
        ) : null}
      </div>

      {open ? (
        <div className="mt-6">
          {loading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-[4/5] animate-pulse rounded-md bg-ink/5"
                />
              ))}
            </div>
          ) : null}

          {error ? (
            <p className="text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}

          {!loading && !error && items.length === 0 ? (
            <p className="text-sm text-ink/55">
              No public Are.na pieces found for your interests yet. Try adding more
              interests or refresh later.
            </p>
          ) : null}

          {!loading && items.length > 0 ? (
            <>
              {basedOn.length > 0 ? (
                <p className="mb-3 text-xs tracking-wide text-ink/45">
                  based on {basedOn.map((s) => s.replace(/-/g, " ")).join(", ")}
                </p>
              ) : null}
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {items.map((item) => (
                  <li key={item.id}>
                    <a
                      href={item.arenaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group block overflow-hidden rounded-md border border-ink/10 bg-paper transition-opacity hover:opacity-90"
                    >
                      <div className="relative aspect-[4/5] bg-ink/5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.imageUrl ?? undefined}
                          alt={item.title}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <div className="space-y-1 p-2.5">
                        <p className="line-clamp-2 text-xs font-medium leading-snug text-ink">
                          {item.title}
                        </p>
                        <p className="text-[0.65rem] uppercase tracking-[0.08em] text-ink/40">
                          {item.type} · {item.matchedInterest.replace(/-/g, " ")}
                        </p>
                      </div>
                    </a>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
