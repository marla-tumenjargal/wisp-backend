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
import type { BoardSuggestion } from "@/lib/suggestions/types";

const WORLD_W = 4800;
const WORLD_H = 3600;
const DOT = 24;

type Placed = BoardSuggestion & {
  x: number;
  y: number;
  rot: number;
  size: number;
};

type GraphStats = { node_count: number; edge_count: number };
type BoardEdge = { id: string; from: string; to: string };

function seededUnit(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function placeItems(items: BoardSuggestion[]): Placed[] {
  return items.map((item, i) => {
    const h = hashId(item.id);
    const a = seededUnit(h * 1.7 + i);
    const b = seededUnit(h * 3.1 + i * 9);
    const c = seededUnit(h * 5.3 + 17);
    const d = seededUnit(h * 7.9 + 4);
    return {
      ...item,
      x: 280 + a * (WORLD_W - 700),
      y: 220 + b * (WORLD_H - 600),
      rot: (c - 0.5) * 12,
      size: 148 + Math.floor(d * 90),
    };
  });
}

function kindLabel(kind: BoardSuggestion["kind"]) {
  switch (kind) {
    case "arena":
      return "are.na";
    case "font":
      return "font";
    case "color":
      return "color";
    case "song":
      return "song";
    case "substack":
      return "substack";
  }
}

export function ArenaSuggestions({
  graphId,
  initialCreating = null,
  initialTheme = null,
  initialGoal = null,
  initialSimilarities = null,
  initialReferenceUrl = null,
}: {
  graphId: string;
  initialCreating?: string | null;
  initialTheme?: string | null;
  initialGoal?: string | null;
  initialSimilarities?: string | null;
  initialReferenceUrl?: string | null;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<BoardSuggestion[]>([]);
  const [leaving, setLeaving] = useState<Set<string>>(new Set());
  const [acceptedIds, setAcceptedIds] = useState<Set<string>>(new Set());
  const [boardEdges, setBoardEdges] = useState<BoardEdge[]>([]);
  const [stats, setStats] = useState<GraphStats | null>(null);
  const [creating, setCreating] = useState<string | null>(initialCreating);
  const [creatingDraft, setCreatingDraft] = useState(initialCreating ?? "");
  const [themeDraft, setThemeDraft] = useState(initialTheme ?? "");
  const [goalDraft, setGoalDraft] = useState(initialGoal ?? "");
  const [similarDraft, setSimilarDraft] = useState(initialSimilarities ?? "");
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [referenceUrl, setReferenceUrl] = useState<string | null>(
    initialReferenceUrl,
  );
  const [focusBusy, setFocusBusy] = useState(false);
  const [substackPubs, setSubstackPubs] = useState<string[]>([]);
  const [showSubstack, setShowSubstack] = useState(false);
  const [substackInput, setSubstackInput] = useState("");
  const [substackBusy, setSubstackBusy] = useState(false);
  const [cam, setCam] = useState({ x: 0, y: 0, z: 0.72 });
  const dragRef = useRef<{
    active: boolean;
    px: number;
    py: number;
    cx: number;
    cy: number;
  }>({ active: false, px: 0, py: 0, cx: 0, cy: 0 });

  const needsMotive = !creating?.trim();

  const loadSuggestions = useCallback(async () => {
    if (!creating?.trim()) {
      setLoading(false);
      setItems([]);
      return;
    }
    setLoading(true);
    setError(null);
    setLeaving(new Set());
    setAcceptedIds(new Set());
    setBoardEdges([]);
    try {
      const res = await fetch(
        `/api/suggestions?graphId=${encodeURIComponent(graphId)}`,
      );
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
      setItems(body.suggestions ?? []);
      setSubstackPubs(body.substack_publications ?? []);
      if (body.motive?.creating) setCreating(body.motive.creating);
      if (body.motive?.reference_image_url)
        setReferenceUrl(body.motive.reference_image_url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load suggestions");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [graphId, creating]);

  useEffect(() => {
    void loadSuggestions();
  }, [loadSuggestions]);

  async function saveMotive(e: React.FormEvent) {
    e.preventDefault();
    if (!creatingDraft.trim() || focusBusy) return;
    setFocusBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("creating", creatingDraft.trim());
      form.append("theme", themeDraft.trim());
      form.append("goal", goalDraft.trim());
      form.append("similarities", similarDraft.trim());
      form.append("reanalyze", "1");
      if (referenceFile) form.append("reference", referenceFile);

      const res = await fetch(`/api/graphs/${graphId}`, {
        method: "PATCH",
        body: form,
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Could not save motive");
      setCreating(body.graph?.creating ?? creatingDraft.trim());
      if (body.graph?.reference_image_url) {
        setReferenceUrl(body.graph.reference_image_url);
      }
      setReferenceFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save motive");
    } finally {
      setFocusBusy(false);
    }
  }

  // Center camera on world once items load
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp || items.length === 0) return;
    const { width, height } = vp.getBoundingClientRect();
    const z = cam.z;
    setCam((c) => ({
      ...c,
      x: width / 2 - (WORLD_W * z) / 2,
      y: height / 2 - (WORLD_H * z) / 2,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only recenter on first load batch
  }, [loading]);

  const placed = useMemo(() => placeItems(items), [items]);
  const placedById = useMemo(() => {
    const map = new Map<string, Placed>();
    for (const p of placed) map.set(p.id, p);
    return map;
  }, [placed]);

  // Load Google Fonts for font cards
  useEffect(() => {
    const hrefs = placed
      .filter((p) => p.kind === "font" && typeof p.meta.googleCss === "string")
      .map((p) => p.meta.googleCss as string);
    for (const href of hrefs) {
      if (document.querySelector(`link[href="${href}"]`)) continue;
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      document.head.appendChild(link);
    }
  }, [placed]);

  useLayoutEffect(() => {
    // edges use world coords from placement centers — no DOM measure needed
  }, [placed, acceptedIds]);

  function onPointerDown(e: React.PointerEvent) {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest("[data-card]")) return;
    dragRef.current = {
      active: true,
      px: e.clientX,
      py: e.clientY,
      cx: cam.x,
      cy: cam.y,
    };
    viewportRef.current?.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.px;
    const dy = e.clientY - dragRef.current.py;
    setCam((c) => ({
      ...c,
      x: dragRef.current.cx + dx,
      y: dragRef.current.cy + dy,
    }));
  }

  function onPointerUp(e: React.PointerEvent) {
    dragRef.current.active = false;
    try {
      viewportRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = vp.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const factor = e.deltaY > 0 ? 0.92 : 1.08;
      setCam((c) => {
        const nextZ = Math.min(2.2, Math.max(0.28, c.z * factor));
        const wx = (mx - c.x) / c.z;
        const wy = (my - c.y) / c.z;
        return {
          z: nextZ,
          x: mx - wx * nextZ,
          y: my - wy * nextZ,
        };
      });
    };
    vp.addEventListener("wheel", onWheel, { passive: false });
    return () => vp.removeEventListener("wheel", onWheel);
  }, []);

  function removeItem(id: string) {
    setLeaving((prev) => new Set(prev).add(id));
    window.setTimeout(() => {
      setItems((prev) => prev.filter((item) => item.id !== id));
      setAcceptedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setBoardEdges((prev) =>
        prev.filter((edge) => edge.from !== id && edge.to !== id),
      );
      setLeaving((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 260);
  }

  function connectAccepted(newId: string, alreadyAccepted: Set<string>) {
    const fresh: BoardEdge[] = [];
    for (const otherId of alreadyAccepted) {
      if (otherId === newId) continue;
      if (!placedById.has(otherId)) continue;
      const [from, to] = newId < otherId ? [newId, otherId] : [otherId, newId];
      fresh.push({ id: `${from}__${to}`, from, to });
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

  async function onYes(item: BoardSuggestion) {
    if (busyId !== null || acceptedIds.has(item.id)) return;
    setBusyId(item.id);
    setError(null);
    try {
      const res = await fetch("/api/suggestions/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suggestion: item, graphId }),
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

  function onNo(item: BoardSuggestion) {
    if (busyId !== null) return;
    removeItem(item.id);
  }

  async function connectSubstack(e: React.FormEvent) {
    e.preventDefault();
    if (!substackInput.trim() || substackBusy) return;
    setSubstackBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/substack/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publication: substackInput }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Could not connect Substack");
      setSubstackPubs(body.publications ?? []);
      setSubstackInput("");
      await loadSuggestions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Substack connect failed");
    } finally {
      setSubstackBusy(false);
    }
  }

  async function disconnectSubstack(slug: string) {
    setSubstackBusy(true);
    try {
      const res = await fetch("/api/substack/connect", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publication: slug }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Could not disconnect");
      setSubstackPubs(body.publications ?? []);
      await loadSuggestions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Disconnect failed");
    } finally {
      setSubstackBusy(false);
    }
  }

  const dotSize = DOT;

  return (
    <div
      ref={viewportRef}
      className="relative min-h-0 flex-1 cursor-grab overflow-hidden bg-paper active:cursor-grabbing"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {/* Infinite dotted world */}
      <div
        ref={worldRef}
        className="absolute left-0 top-0 origin-top-left will-change-transform"
        style={{
          width: WORLD_W,
          height: WORLD_H,
          transform: `translate(${cam.x}px, ${cam.y}px) scale(${cam.z})`,
          backgroundColor: "var(--paper)",
          backgroundImage:
            "radial-gradient(circle, rgba(12, 12, 12, 0.18) 1px, transparent 1px)",
          backgroundSize: `${dotSize}px ${dotSize}px`,
          backgroundPosition: "12px 12px",
        }}
      >
        <svg
          className="pointer-events-none absolute inset-0 z-[1]"
          width={WORLD_W}
          height={WORLD_H}
          aria-hidden
        >
          {boardEdges.map((edge) => {
            const a = placedById.get(edge.from);
            const b = placedById.get(edge.to);
            if (!a || !b) return null;
            const ax = a.x + a.size / 2;
            const ay = a.y + (a.size * 1.15) / 2;
            const bx = b.x + b.size / 2;
            const by = b.y + (b.size * 1.15) / 2;
            return (
              <line
                key={edge.id}
                x1={ax}
                y1={ay}
                x2={bx}
                y2={by}
                stroke="#16a34a"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </svg>

        {!loading &&
          placed.map((item, i) => {
            const isLeaving = leaving.has(item.id);
            const isBusy = busyId === item.id;
            const isAccepted = acceptedIds.has(item.id);
            const swatches = Array.isArray(item.meta.swatches)
              ? (item.meta.swatches as string[])
              : [];
            const sample =
              typeof item.meta.sample === "string" ? item.meta.sample : "Aa";
            const fontFamily =
              typeof item.meta.family === "string" ? item.meta.family : undefined;

            return (
              <div
                key={item.id}
                data-card
                data-node-id={item.id}
                className="absolute cursor-auto"
                style={{
                  left: item.x,
                  top: item.y,
                  width: item.size,
                  transform: `rotate(${item.rot}deg)`,
                }}
              >
                <article
                  className={[
                    "group overflow-hidden rounded-sm bg-white shadow-[0_1px_0_rgba(0,0,0,0.04)] transition-[box-shadow,border-color] hover:z-10 hover:shadow-md",
                    isAccepted ? "border border-green-600" : "border border-ink/10",
                    isLeaving ? "animate-scatter-out" : "animate-scatter-in",
                  ].join(" ")}
                  style={{
                    borderWidth: 1,
                    animationDelay: isLeaving ? undefined : `${i * 30}ms`,
                  }}
                >
                  <div className="relative aspect-[4/5] w-full bg-ink/5">
                    {item.kind === "color" ? (
                      <div className="flex h-full flex-col">
                        {swatches.map((hex) => (
                          <div
                            key={hex}
                            className="flex-1"
                            style={{ backgroundColor: hex }}
                            title={hex}
                          />
                        ))}
                      </div>
                    ) : item.kind === "font" ? (
                      <div className="flex h-full flex-col items-center justify-center gap-2 bg-paper px-3 text-center">
                        <p
                          className="text-[1.65rem] leading-tight text-ink"
                          style={{ fontFamily: `"${fontFamily}", sans-serif` }}
                        >
                          {sample}
                        </p>
                        <p
                          className="text-xs text-ink/50"
                          style={{ fontFamily: `"${fontFamily}", sans-serif` }}
                        >
                          {item.title}
                        </p>
                      </div>
                    ) : item.meta?.isReferenceBrief &&
                      typeof item.meta.aestheticSummary === "string" &&
                      !item.imageUrl ? (
                      <div className="flex h-full flex-col justify-end bg-ink p-3 text-paper">
                        <p className="text-[0.6rem] tracking-wide text-paper/50 lowercase">
                          lookalike brief
                        </p>
                        <p className="mt-2 line-clamp-6 text-[0.7rem] leading-snug text-paper/90">
                          {item.meta.aestheticSummary as string}
                        </p>
                      </div>
                    ) : item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="h-full w-full object-cover"
                        draggable={false}
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center px-3 text-center text-xs text-ink/40">
                        {kindLabel(item.kind)}
                      </div>
                    )}

                    <span className="absolute left-1.5 top-1.5 rounded-[2px] bg-white/90 px-1.5 py-0.5 text-[0.6rem] tracking-wide text-ink/55 lowercase">
                      {kindLabel(item.kind)}
                    </span>

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
                    {item.subtitle ? (
                      <p className="mt-0.5 line-clamp-1 text-[0.6rem] text-ink/40">
                        {item.subtitle}
                      </p>
                    ) : null}
                  </div>
                </article>
              </div>
            );
          })}
      </div>

      {/* Chrome */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between px-6 py-4 sm:px-10">
        <div className="max-w-[55%]">
          <p className="text-xs tracking-[0.12em] text-ink/40 lowercase">
            creating
          </p>
          <p className="mt-1 line-clamp-2 text-sm text-ink/70">
            {creating?.trim() || "tell us what you’re making"}
          </p>
          <p className="mt-1 text-[0.65rem] text-ink/35">
            drag to pan · scroll to zoom
          </p>
        </div>
        <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-3 text-xs text-ink/45">
          {stats ? (
            <Link
              href={`/dashboard/graphs/${graphId}/graph`}
              className="hover:text-ink"
            >
              graph · {stats.node_count}n · {stats.edge_count}e
            </Link>
          ) : acceptedIds.size > 0 ? (
            <span>{acceptedIds.size} on graph</span>
          ) : (
            <span>are.na · font · color · song · substack</span>
          )}
          <button
            type="button"
            onClick={() => setShowSubstack((v) => !v)}
            className="tracking-wide hover:text-ink"
          >
            substack
          </button>
          <button
            type="button"
            onClick={() => void loadSuggestions()}
            disabled={needsMotive}
            className="tracking-wide hover:text-ink disabled:opacity-40"
          >
            refresh
          </button>
        </div>
      </div>

      {needsMotive ? (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-paper/70 px-6 backdrop-blur-[2px]">
          <form
            onSubmit={(e) => void saveMotive(e)}
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto border border-ink/10 bg-white p-6 shadow-sm"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <p className="text-xs tracking-[0.12em] text-ink/40 lowercase">
              inspiration board
            </p>
            <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-[-0.02em] text-ink">
              What are you creating?
            </h2>
            <p className="mt-2 text-sm text-ink/55">
              Wisp gathers stylish references across mediums. Tell us the motive —
              theme, goal, and what you want it to feel similar to. Optionally
              upload a photo for lookalike search.
            </p>
            <textarea
              value={creatingDraft}
              onChange={(e) => setCreatingDraft(e.target.value)}
              rows={2}
              required
              placeholder="a citrus summer lookbook"
              className="mt-4 w-full resize-none border border-ink/15 bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-ink/40"
            />
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <input
                value={themeDraft}
                onChange={(e) => setThemeDraft(e.target.value)}
                placeholder="theme / world"
                className="border border-ink/15 bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-ink/40"
              />
              <input
                value={goalDraft}
                onChange={(e) => setGoalDraft(e.target.value)}
                placeholder="goal"
                className="border border-ink/15 bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-ink/40"
              />
            </div>
            <input
              value={similarDraft}
              onChange={(e) => setSimilarDraft(e.target.value)}
              placeholder="similar to / look & feel"
              className="mt-3 w-full border border-ink/15 bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-ink/40"
            />
            <div className="mt-3 flex items-center gap-3">
              <label className="cursor-pointer border border-ink/15 bg-paper px-3 py-2 text-xs text-ink">
                reference photo
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) =>
                    setReferenceFile(e.target.files?.[0] ?? null)
                  }
                />
              </label>
              <span className="text-xs text-ink/40">
                {referenceFile?.name ||
                  (referenceUrl ? "reference on file" : "optional")}
              </span>
            </div>
            <button
              type="submit"
              disabled={focusBusy || !creatingDraft.trim()}
              className="mt-4 rounded-md bg-klein px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              {focusBusy ? "reading taste…" : "scatter inspiration"}
            </button>
          </form>
        </div>
      ) : null}

      {showSubstack ? (
        <div className="absolute bottom-6 left-1/2 z-30 w-[min(92vw,420px)] -translate-x-1/2 rounded-md border border-ink/10 bg-white/95 p-4 shadow-sm backdrop-blur-sm">
          <p className="text-sm font-medium text-ink">Connect Substack</p>
          <p className="mt-1 text-xs text-ink/50">
            Paste a publication URL or slug. We read the public Substack posts API
            (no official OAuth).
          </p>
          <form onSubmit={(e) => void connectSubstack(e)} className="mt-3 flex gap-2">
            <input
              value={substackInput}
              onChange={(e) => setSubstackInput(e.target.value)}
              placeholder="dense-discovery or https://….substack.com"
              className="min-w-0 flex-1 rounded-md border border-ink/15 bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-ink/40"
            />
            <button
              type="submit"
              disabled={substackBusy}
              className="rounded-md bg-ink px-3 py-2 text-sm text-paper disabled:opacity-50"
            >
              {substackBusy ? "…" : "add"}
            </button>
          </form>
          {substackPubs.length > 0 ? (
            <ul className="mt-3 space-y-1.5">
              {substackPubs.map((slug) => (
                <li
                  key={slug}
                  className="flex items-center justify-between text-xs text-ink/70"
                >
                  <a
                    href={`https://${slug}.substack.com`}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-ink"
                  >
                    {slug}
                  </a>
                  <button
                    type="button"
                    disabled={substackBusy}
                    onClick={() => void disconnectSubstack(slug)}
                    className="text-ink/40 hover:text-ink"
                  >
                    remove
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-xs text-ink/40">
              Using curated creative publications until you connect your own.
            </p>
          )}
          <button
            type="button"
            onClick={() => setShowSubstack(false)}
            className="mt-3 text-xs text-ink/45 hover:text-ink"
          >
            close
          </button>
        </div>
      ) : null}

      {loading ? (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <p className="rounded-md bg-white/80 px-4 py-2 text-sm tracking-wide text-ink/45 backdrop-blur-sm">
            scattering ideas…
          </p>
        </div>
      ) : null}

      {!loading && error ? (
        <div className="absolute bottom-6 left-1/2 z-30 max-w-md -translate-x-1/2 rounded-md border border-red-200 bg-white/90 px-4 py-2 text-center text-sm text-red-700 shadow-sm">
          {error}
        </div>
      ) : null}

      {!loading && placed.length === 0 ? (
        <div className="pointer-events-auto absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 px-6">
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
    </div>
  );
}
