import type { CSSProperties } from "react";

export const VISUAL_TREATMENTS: Record<
  string,
  { mark: string; style: CSSProperties }
> = {
  cinematic: {
    mark: "∙∙",
    style: {
      background:
        "linear-gradient(180deg, #111 0%, #1a1208 45%, #3d2914 100%)",
      color: "#e8d5a3",
      letterSpacing: "0.18em",
    },
  },
  editorial: {
    mark: "Ed",
    style: {
      background:
        "repeating-linear-gradient(0deg, transparent, transparent 11px, rgba(12,12,12,0.07) 11px, rgba(12,12,12,0.07) 12px), #efe8dc",
      color: "#1a1a1a",
      fontFamily: "Georgia, serif",
      fontStyle: "italic",
    },
  },
  experimental: {
    mark: "×",
    style: {
      background:
        "linear-gradient(135deg, #0c0c0c 0%, #0c0c0c 42%, #002fa7 42%, #002fa7 62%, #f4f4f2 62%)",
      color: "#f4f4f2",
    },
  },
  brutalist: {
    mark: "B",
    style: {
      background: "#0c0c0c",
      color: "#f4f4f2",
      fontWeight: 800,
    },
  },
  futuristic: {
    mark: "01",
    style: {
      background:
        "linear-gradient(160deg, #061018 0%, #0a2a3a 50%, #002fa7 100%)",
      color: "#9ad7ff",
      fontFamily: "ui-monospace, monospace",
      letterSpacing: "0.12em",
    },
  },
  generative: {
    mark: "∴",
    style: {
      background:
        "radial-gradient(circle at 20% 30%, #002fa7 0%, transparent 40%), radial-gradient(circle at 80% 70%, #7b2cbf 0%, transparent 35%), #0c0c0c",
      color: "#f4f4f2",
    },
  },
  monochrome: {
    mark: "▮",
    style: {
      background: "linear-gradient(90deg, #0c0c0c 50%, #e8e8e4 50%)",
      color: "#f4f4f2",
    },
  },
  swiss: {
    mark: "CH",
    style: {
      background: "#fff",
      color: "#e30613",
      fontFamily: "Helvetica, Arial, sans-serif",
      fontWeight: 700,
    },
  },
  architecture: {
    mark: "△",
    style: {
      background:
        "linear-gradient(180deg, #cfc8be 0%, #8a847c 55%, #3d3a36 100%)",
      color: "#f4f4f2",
    },
  },
  minimal: {
    mark: "Aa",
    style: {
      background: "linear-gradient(180deg, #f7f7f5 0%, #e4e4de 100%)",
      color: "#0c0c0c",
      letterSpacing: "-0.04em",
    },
  },
  soft: {
    mark: "·",
    style: {
      background:
        "radial-gradient(circle at 50% 60%, #fce8e8 0%, #e8d5e8 50%, #d5e0f0 100%)",
      color: "#6b5b6b",
    },
  },
  fashion: {
    mark: "i-D",
    style: {
      background: "#0c0c0c",
      color: "#f4f4f2",
      fontStyle: "italic",
    },
  },
  retro: {
    mark: "′78",
    style: {
      background:
        "linear-gradient(180deg, #f2c94c 0%, #f2c94c 33%, #eb5757 33%, #eb5757 66%, #2d9cdb 66%)",
      color: "#0c0c0c",
      fontFamily: "Georgia, serif",
      fontWeight: 700,
    },
  },
  industrial: {
    mark: "I",
    style: {
      background:
        "repeating-linear-gradient(90deg, #3d3d3d, #3d3d3d 2px, #2a2a2a 2px, #2a2a2a 8px)",
      color: "#c4c4c0",
      fontFamily: "ui-monospace, monospace",
    },
  },
  organic: {
    mark: "ø",
    style: {
      background:
        "radial-gradient(ellipse at 30% 40%, #c8d5b9 0%, #a3b18a 45%, #588157 100%)",
      color: "#1b4332",
      fontFamily: "Georgia, serif",
    },
  },
  maximalist: {
    mark: "M+",
    style: {
      background:
        "conic-gradient(from 30deg, #e63946, #f4a261, #2a9d8f, #264653, #e63946)",
      color: "#fff",
    },
  },
};

export function visualFor(key: string) {
  return VISUAL_TREATMENTS[key] ?? VISUAL_TREATMENTS.editorial!;
}
