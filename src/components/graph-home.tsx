"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { displayGraphName } from "@/lib/graphs/types";
import type { GraphRecord } from "@/lib/graphs/types";

type GraphHomeProps = {
  initialGraphs: Array<
    GraphRecord & { node_count?: number; edge_count?: number }
  >;
};

export function GraphHome({ initialGraphs }: GraphHomeProps) {
  const router = useRouter();
  const [graphs, setGraphs] = useState(initialGraphs);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState("");
  const [theme, setTheme] = useState("");
  const [goal, setGoal] = useState("");
  const [similarities, setSimilarities] = useState("");
  const [reference, setReference] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  function onPickReference(file: File | null) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setReference(file);
    setPreviewUrl(file ? URL.createObjectURL(file) : null);
  }

  async function create(e?: React.FormEvent) {
    e?.preventDefault();
    if (busy) return;
    if (!creating.trim()) {
      setError("What are you creating? That motive shapes the board.");
      setShowForm(true);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("creating", creating.trim());
      if (name.trim()) form.append("name", name.trim());
      if (theme.trim()) form.append("theme", theme.trim());
      if (goal.trim()) form.append("goal", goal.trim());
      if (similarities.trim()) form.append("similarities", similarities.trim());
      if (reference) form.append("reference", reference);

      const res = await fetch("/api/graphs", {
        method: "POST",
        body: form,
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Could not create graph");
      const graph = body.graph as GraphRecord;
      setGraphs((prev) => [{ ...graph, node_count: 0, edge_count: 0 }, ...prev]);
      setName("");
      setCreating("");
      setTheme("");
      setGoal("");
      setSimilarities("");
      onPickReference(null);
      setShowForm(false);
      router.push(`/dashboard/graphs/${graph.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  async function removeGraph(id: string) {
    if (busy) return;
    if (!window.confirm("Delete this graph and its board data?")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/graphs/${id}`, { method: "DELETE" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Could not delete");
      setGraphs((prev) => prev.filter((g) => g.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12 sm:px-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs tracking-[0.14em] text-ink/40 lowercase">
            inspiration boards
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl font-bold tracking-[-0.03em] text-ink">
            dashboard
          </h1>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-ink/55">
            Wisp is for creatives and designers gathering inspiration across
            mediums — Are.na, type, color, sound, essays — not another Pinterest
            moodboard. Each graph starts from what you&apos;re making.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="rounded-md bg-ink px-4 py-2.5 text-sm text-paper"
        >
          {showForm ? "cancel" : "new board"}
        </button>
      </div>

      {showForm ? (
        <form
          onSubmit={(e) => void create(e)}
          className="mt-8 space-y-5 border border-ink/10 bg-white/70 p-5"
        >
          <div>
            <label className="text-sm font-medium text-ink" htmlFor="creating">
              What are you creating?
            </label>
            <p className="mt-1 text-xs text-ink/45">
              The motive behind this board — a campaign, lookbook, album cover,
              type system, film still deck…
            </p>
            <textarea
              id="creating"
              required
              value={creating}
              onChange={(e) => setCreating(e.target.value)}
              rows={2}
              placeholder="a summer lookbook rooted in citrus and coastal flora"
              className="mt-2 w-full resize-none border border-ink/15 bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-ink/40"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs tracking-wide text-ink/45" htmlFor="theme">
                theme / world
              </label>
              <input
                id="theme"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                placeholder="orange, nature, soft grain"
                className="mt-1 w-full border border-ink/15 bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-ink/40"
              />
            </div>
            <div>
              <label className="text-xs tracking-wide text-ink/45" htmlFor="goal">
                goal
              </label>
              <input
                id="goal"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="palette + type + sonic mood"
                className="mt-1 w-full border border-ink/15 bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-ink/40"
              />
            </div>
          </div>

          <div>
            <label
              className="text-xs tracking-wide text-ink/45"
              htmlFor="similarities"
            >
              similar to / look & feel
            </label>
            <input
              id="similarities"
              value={similarities}
              onChange={(e) => setSimilarities(e.target.value)}
              placeholder="Agnès Varda seaside frames, Loewe still life, warm offset print"
              className="mt-1 w-full border border-ink/15 bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-ink/40"
            />
          </div>

          <div>
            <p className="text-xs tracking-wide text-ink/45">
              reference photo{" "}
              <span className="text-ink/30">(optional — similarity search)</span>
            </p>
            <p className="mt-1 text-xs text-ink/40">
              Upload something you want lookalikes of. We read palette, texture,
              and composition, then recommend stylish pieces in the same vein.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-4">
              <label className="cursor-pointer rounded-md border border-ink/15 bg-paper px-3 py-2 text-sm text-ink hover:border-ink/30">
                choose image
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) =>
                    onPickReference(e.target.files?.[0] ?? null)
                  }
                />
              </label>
              {reference ? (
                <button
                  type="button"
                  onClick={() => onPickReference(null)}
                  className="text-xs text-ink/40 hover:text-ink"
                >
                  remove
                </button>
              ) : null}
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt="Reference preview"
                  className="h-16 w-16 object-cover"
                />
              ) : null}
            </div>
          </div>

          <div>
            <label className="text-xs tracking-wide text-ink/45" htmlFor="name">
              board name <span className="text-ink/30">(optional)</span>
            </label>
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="defaults to what you’re creating"
              className="mt-1 w-full border border-ink/15 bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-ink/40"
            />
          </div>

          <button
            type="submit"
            disabled={busy || !creating.trim()}
            className="rounded-md bg-klein px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {busy ? "reading taste…" : "open inspiration board"}
          </button>
        </form>
      ) : null}

      {error ? (
        <p className="mt-4 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <ul className="mt-10 space-y-3">
        {graphs.length === 0 ? (
          <li className="border border-dashed border-ink/15 px-5 py-10 text-center text-sm text-ink/45">
            No boards yet. Start from what you&apos;re creating.
          </li>
        ) : (
          graphs.map((graph) => (
            <li
              key={graph.id}
              className="flex items-stretch justify-between gap-4 border border-ink/10 bg-white/60 px-5 py-4 transition hover:border-ink/25"
            >
              <Link
                href={`/dashboard/graphs/${graph.id}`}
                className="flex min-w-0 flex-1 gap-4"
              >
                {graph.reference_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={graph.reference_image_url}
                    alt=""
                    className="h-16 w-16 shrink-0 object-cover"
                  />
                ) : null}
                <div className="min-w-0">
                  <p className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-[-0.02em] text-ink">
                    {displayGraphName(graph)}
                  </p>
                  {graph.creating?.trim() || graph.focus?.trim() ? (
                    <p className="mt-1 line-clamp-2 text-sm text-ink/55">
                      <span className="text-ink/35">creating · </span>
                      {graph.creating || graph.focus}
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-amber-800/70">
                      needs a motive — open to set one
                    </p>
                  )}
                  {(graph.theme || graph.goal) && (
                    <p className="mt-1 line-clamp-1 text-xs text-ink/40">
                      {[graph.theme, graph.goal].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  <p className="mt-2 text-[0.65rem] tracking-wide text-ink/40">
                    {(graph.node_count ?? 0)} nodes · {(graph.edge_count ?? 0)}{" "}
                    edges
                  </p>
                </div>
              </Link>
              <div className="flex shrink-0 flex-col items-end justify-between">
                <Link
                  href={`/dashboard/graphs/${graph.id}`}
                  className="text-xs tracking-wide text-klein hover:underline"
                >
                  open →
                </Link>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void removeGraph(graph.id)}
                  className="text-xs text-ink/35 hover:text-red-700 disabled:opacity-50"
                >
                  delete
                </button>
              </div>
            </li>
          ))
        )}
      </ul>

      {!showForm && graphs.length === 0 ? (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="mt-6 rounded-md bg-ink px-4 py-2.5 text-sm text-paper"
        >
          what are you creating?
        </button>
      ) : null}
    </main>
  );
}
