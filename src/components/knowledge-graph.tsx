"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type GraphNode = {
  id: string;
  title: string;
  source: string | null;
  image_url: string | null;
  tags: string[] | null;
};

export type GraphEdge = {
  id: string;
  source_node_id: string;
  target_node_id: string;
  edge_type: string;
  weight: number;
};

type SimNode = GraphNode & {
  x: number;
  y: number;
  vx: number;
  vy: number;
};

type KnowledgeGraphProps = {
  nodes: GraphNode[];
  edges: GraphEdge[];
};

function seeded(seed: number) {
  const x = Math.sin(seed * 9999) * 10000;
  return x - Math.floor(x);
}

export function KnowledgeGraph({ nodes, edges }: KnowledgeGraphProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 900, h: 640 });
  const [sim, setSim] = useState<SimNode[]>([]);
  const [hoverId, setHoverId] = useState<string | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ w: Math.max(320, width), h: Math.max(560, height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Initialize positions when nodes/size change
  useEffect(() => {
    if (nodes.length === 0) {
      setSim([]);
      return;
    }
    const cx = size.w / 2;
    const cy = size.h / 2;
    const r = Math.min(size.w, size.h) * 0.32;
    setSim(
      nodes.map((node, i) => {
        const angle = (i / nodes.length) * Math.PI * 2 + seeded(i + 1) * 0.4;
        const jitter = 0.7 + seeded(i * 13) * 0.5;
        return {
          ...node,
          x: cx + Math.cos(angle) * r * jitter,
          y: cy + Math.sin(angle) * r * jitter,
          vx: 0,
          vy: 0,
        };
      }),
    );
  }, [nodes, size.w, size.h]);

  // Simple force simulation
  useEffect(() => {
    if (sim.length === 0) return;
    let frame = 0;
    let alive = true;
    const idSet = new Set(nodes.map((n) => n.id));
    const links = edges.filter(
      (e) => idSet.has(e.source_node_id) && idSet.has(e.target_node_id),
    );

    const tick = () => {
      if (!alive) return;
      frame += 1;
      setSim((prev) => {
        if (prev.length === 0) return prev;
        const next = prev.map((n) => ({ ...n }));
        const byId = new Map(next.map((n) => [n.id, n]));
        const cx = size.w / 2;
        const cy = size.h / 2;

        // Repulsion
        for (let i = 0; i < next.length; i++) {
          for (let j = i + 1; j < next.length; j++) {
            const a = next[i];
            const b = next[j];
            let dx = a.x - b.x;
            let dy = a.y - b.y;
            const dist = Math.hypot(dx, dy) || 0.01;
            const minDist = 130;
            if (dist < minDist * 2.2) {
              const force = ((minDist * minDist) / (dist * dist)) * 0.4;
              dx = (dx / dist) * force;
              dy = (dy / dist) * force;
              a.vx += dx;
              a.vy += dy;
              b.vx -= dx;
              b.vy -= dy;
            }
          }
        }

        // Springs along edges
        for (const link of links) {
          const a = byId.get(link.source_node_id);
          const b = byId.get(link.target_node_id);
          if (!a || !b) continue;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.hypot(dx, dy) || 0.01;
          const ideal = 180 / Math.max(link.weight, 0.5);
          const force = (dist - ideal) * 0.015;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          a.vx += fx;
          a.vy += fy;
          b.vx -= fx;
          b.vy -= fy;
        }

        // Center gravity + damping + bounds
        const pad = 64;
        for (const n of next) {
          n.vx += (cx - n.x) * 0.004;
          n.vy += (cy - n.y) * 0.004;
          n.vx *= 0.86;
          n.vy *= 0.86;
          n.x = Math.min(size.w - pad, Math.max(pad, n.x + n.vx));
          n.y = Math.min(size.h - pad, Math.max(pad, n.y + n.vy));
        }
        return next;
      });

      if (frame < 180) {
        requestAnimationFrame(tick);
      }
    };

    const raf = requestAnimationFrame(tick);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
    // Only re-run layout when topology/size changes; sim state updates internally
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges, size.w, size.h]);

  const positions = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    for (const n of sim) map.set(n.id, { x: n.x, y: n.y });
    return map;
  }, [sim]);

  if (nodes.length === 0) {
    return (
      <div className="dot-grid flex flex-1 items-center justify-center text-sm text-ink/45">
        No nodes yet — say yes to pieces on the feed.
      </div>
    );
  }

  return (
    <div
      ref={wrapRef}
      className="dot-grid relative min-h-[70dvh] flex-1 overflow-hidden sm:min-h-[75dvh]"
    >
      <svg
        className="absolute inset-0 h-full w-full"
        width={size.w}
        height={size.h}
        aria-hidden
      >
        {edges.map((edge) => {
          const a = positions.get(edge.source_node_id);
          const b = positions.get(edge.target_node_id);
          if (!a || !b) return null;
          const active =
            hoverId === edge.source_node_id || hoverId === edge.target_node_id;
          return (
            <line
              key={edge.id}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={active ? "#002fa7" : "rgba(12,12,12,0.18)"}
              strokeWidth={active ? 1.5 : 1}
            />
          );
        })}
      </svg>

      {sim.map((node) => {
        const isArena = node.source === "arena";
        const hovered = hoverId === node.id;
        return (
          <div
            key={node.id}
            className={[
              "absolute -translate-x-1/2 -translate-y-1/2 cursor-default transition-transform",
              hovered ? "z-20 scale-105" : "z-10",
            ].join(" ")}
            style={{ left: node.x, top: node.y }}
            onMouseEnter={() => setHoverId(node.id)}
            onMouseLeave={() => setHoverId(null)}
          >
            <div
              className={[
                "overflow-hidden rounded-full border bg-white shadow-md",
                isArena ? "border-klein/40" : "border-ink/15",
                hovered ? "ring-2 ring-klein/35" : "",
              ].join(" ")}
              style={{ width: 88, height: 88 }}
            >
              {node.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={node.image_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-paper text-[0.7rem] uppercase tracking-wide text-ink/40">
                  {isArena ? "a" : "n"}
                </div>
              )}
            </div>
            {hovered ? (
              <div className="absolute left-1/2 top-[calc(100%+10px)] w-48 -translate-x-1/2 rounded-md border border-ink/10 bg-white/95 px-3 py-2 text-center shadow-sm">
                <p className="line-clamp-2 text-[0.8rem] font-medium leading-snug text-ink">
                  {node.title}
                </p>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
