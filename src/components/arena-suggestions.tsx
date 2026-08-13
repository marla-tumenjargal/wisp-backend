"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ArenaSuggestion } from "@/lib/arena/recommend";

type PlacedSuggestion = ArenaSuggestion & {
  x: number; // 0–100 %
  y: number;
  rot: number;
  size: number; // px width
};

type GraphStats = { node_count: number; edge_count: number };

type BoardEdge = {
  id: string;
  from: number;
  to: number;
};

function seededUnit(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function placeItems(items: ArenaSuggestion[]): PlacedSuggestion[] {
  return items.map((item, i) => {
    const a = seededUnit(item.id * 1.7 + i);
    const b = seededUnit(item.id * 3.1 + i * 9);
    const c = seededUnit(item.id * 5.3 + 17);
    const d = seededUnit(item.id * 7.9 + 4);
    return {
      ...item,
      x: 6 + a * 72,
      y: 8 + b * 68,
      rot: (c - 0.5) * 14,
      size: 140 + Math.floor(d * 100),
    };
  });
}

export function ArenaSuggestions() {
  const boardRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ArenaSuggestion[]>([]);
  const [leaving, setLeaving] = useState<Set<number>>(new Set());
  const [acceptedIds, setAcceptedIds] = useState<Set<number>>(new Set());
  const [boardEdges, setBoardEdges] = useState<BoardEdge[]>([]);
  const [stats, setStats] = useState<GraphStats | null>(null);
  const [centers, setCenters] = useState<Map<number, { x: number; y: number }>>(
    new Map(),
  );
  const [boardSize, setBoardSize] = useState({ w: 0, h: 0 });

  const loadSuggestions = useCallback(async () => {
    setLoading(true);
    setError(null);
    setLeaving(new Set());
    setAcceptedIds(new Set());
    setBoardEdges([]);
    try {
      const res = await fetch("/api/arena/suggestions");
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
      setItems(body.suggestions ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load suggestions");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSuggestions();
  }, [loadSuggestions]);

  const placed = useMemo(() => placeItems(items), [items]);
  const placedById = useMemo(() => {
    const map = new Map<number, PlacedSuggestion>();
    for (const p of placed) map.set(p.id, p);
    return map;
  }, [placed]);

  // Measure card centers in board coordinates for edge drawing
  useLayoutEffect(() => {
    const board = boardRef.current;
    if (!board) return;

    const measure = () => {
      const rect = board.getBoundingClientRect();
      setBoardSize({ w: rect.width, h: rect.height });
      const next = new Map<number, { x: number; y: number }>();
      for (const item of placed) {
        const el = board.querySelector<HTMLElement>(
          `[data-node-id="${item.id}"]`,
        );
        if (!el) continue;
        const r = el.getBoundingClientRect();
        next.set(item.id, {
          x: r.left - rect.left + r.width / 2,
          y: r.top - rect.top + r.height / 2,
        });
      }
      setCenters(next);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(board);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [placed, leaving, acceptedIds]);

  function removeItem(id: number) {
    setLeaving((prev) => new Set(prev).add(id));
    window.setTimeout(() => {
      setItems((prev) => prev.filter((item) => item.id !== id));
      setAcceptedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setBoardEdges((prev) =>
        prev.filter((e) => e.from !== id && e.to !== id),
      );
      setLeaving((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 260);
  }

  function connectAccepted(newId: number, alreadyAccepted: Set<number>) {
    const fresh: BoardEdge[] = [];
    for (const otherId of alreadyAccepted) {
      if (otherId === newId) continue;
      if (!placedById.has(otherId)) continue;

      const [from, to] = newId < otherId ? [newId, otherId] : [otherId, newId];
      fresh.push({
        id: `${from}-${to}`,
        from,
        to,
      });
    }

    setBoardEdges((prev) => {
      const seen = new Set(prev.map((e) => e.id));
      const merged = [...prev];
      for (const edge of fresh) {
        if (seen.has(edge.id)) continue;
        seen.add(edge.id);
        merged.push(edge);
      }
      return merged;
    });
  }

  async function onYes(item: ArenaSuggestion) {
    if (busyId !== null || acceptedIds.has(item.id)) return;
    setBusyId(item.id);
    setError(null);
    try {
      const res = await fetch("/api/arena/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suggestion: item }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Could not add to graph");

      const nextAccepted = new Set(acceptedIds);
      nextAccepted.add(item.id);
      setAcceptedIds(nextAccepted);
      connectAccepted(item.id, nextAccepted);
      setStats({
        node_count: body.node_count,
        edge_count: body.edge_count,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Accept failed");
    } finally {
      setBusyId(null);
    }
  }

  function onNo(item: ArenaSuggestion) {
    if (busyId !== null) return;
    // Dismissed pieces leave the board
    removeItem(item.id);
  }

  return (
    <div ref={boardRef} className="dot-grid relative min-h-0 flex-1 overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between px-6 py-4 sm:px-10">
        <p className="text-xs tracking-[0.12em] text-ink/40 lowercase">
          are.na suggestions
        </p>
        <div className="pointer-events-auto flex items-center gap-4 text-xs text-ink/45">
          {stats ? (
            <Link href="/dashboard/graph" className="hover:text-ink">
              graph · {stats.node_count}n · {stats.edge_count}e
            </Link>
          ) : acceptedIds.size > 0 ? (
            <span>{acceptedIds.size} on graph</span>
          ) : (
            <span>hover · yes adds an edge · × removes</span>
          )}
          <button
            type="button"
            onClick={() => void loadSuggestions()}
            className="tracking-wide hover:text-ink"
          >
            refresh
          </button>
        </div>
      </div>

      {/* Green graph edges — stay under cards, above dots */}
      {boardEdges.length > 0 && boardSize.w > 0 ? (
        <svg
          className="pointer-events-none absolute inset-0 z-[1]"
          width={boardSize.w}
          height={boardSize.h}
          aria-hidden
        >
          {boardEdges.map((edge) => {
            const a = centers.get(edge.from);
            const b = centers.get(edge.to);
            if (!a || !b) return null;
            return (
              <line
                key={edge.id}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="#16a34a"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </svg>
      ) : null}

      {loading ? (
        <div className="flex h-full items-center justify-center">
          <p className="text-sm tracking-wide text-ink/45">scattering are.na…</p>
        </div>
      ) : null}

      {!loading && error ? (
        <div className="absolute bottom-6 left-1/2 z-30 max-w-md -translate-x-1/2 rounded-md border border-red-200 bg-white/90 px-4 py-2 text-center text-sm text-red-700 shadow-sm">
          {error}
        </div>
      ) : null}

      {!loading && placed.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center gap-4 px-6">
          <p className="text-sm text-ink/50">No suggestions right now.</p>
          <button
            type="button"
            onClick={() => void loadSuggestions()}
            className="rounded-md bg-ink px-4 py-2 text-sm text-paper"
          >
            Refresh
          </button>
        </div>
      ) : null}

      {!loading && placed.length > 0 ? (
        <div className="absolute inset-0 z-[2]">
          {placed.map((item, i) => {
            const isLeaving = leaving.has(item.id);
            const isBusy = busyId === item.id;
            const isAccepted = acceptedIds.has(item.id);

            return (
              <div
                key={item.id}
                data-node-id={item.id}
                className="absolute"
                style={{
                  left: `${item.x}%`,
                  top: `${item.y}%`,
                  width: item.size,
                  transform: `rotate(${item.rot}deg)`,
                }}
              >
                <article
                  className={[
                    "group overflow-hidden rounded-sm bg-white shadow-[0_1px_0_rgba(0,0,0,0.04)] transition-[box-shadow,border-color] hover:z-10 hover:shadow-md",
                    isAccepted
                      ? "border border-green-600"
                      : "border border-ink/10",
                    isLeaving ? "animate-scatter-out" : "animate-scatter-in",
                  ].join(" ")}
                  style={{
                    // Keep accepted outline thin (1px)
                    borderWidth: 1,
                    animationDelay: isLeaving ? undefined : `${i * 40}ms`,
                  }}
                >
                  <div className="relative aspect-[4/5] w-full bg-ink/5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.imageUrl ?? undefined}
                      alt={item.title}
                      className="h-full w-full object-cover"
                      draggable={false}
                    />

                    {!isAccepted ? (
                      <div className="absolute inset-0 flex items-center justify-center gap-3 bg-ink/45 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                        <button
                          type="button"
                          disabled={isBusy || isLeaving}
                          aria-label="Dismiss"
                          onClick={() => onNo(item)}
                          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/40 bg-white/10 text-lg text-white backdrop-blur-sm transition hover:bg-white/25 disabled:opacity-50"
                        >
                          ×
                        </button>
                        <button
                          type="button"
                          disabled={isBusy || isLeaving}
                          aria-label="Add to graph"
                          onClick={() => void onYes(item)}
                          className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-sm font-semibold tracking-wide text-ink transition hover:bg-paper disabled:opacity-50"
                        >
                          {isBusy ? "…" : "yes"}
                        </button>
                      </div>
                    ) : (
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-green-950/40 to-transparent px-2 py-2">
                        <p className="text-center text-[0.65rem] font-medium tracking-wide text-white/90">
                          on graph
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="border-t border-ink/5 px-2.5 py-2">
                    <p className="line-clamp-2 text-[0.7rem] font-medium leading-snug text-ink/80">
                      {item.title}
                    </p>
                  </div>
                </article>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
