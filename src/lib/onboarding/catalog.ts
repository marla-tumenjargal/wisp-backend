export const DESIGNER_ROLES = [
  "Product Designer",
  "UX Designer",
  "UI Designer",
  "Creative Technologist",
  "Design Engineer",
  "Creative Developer",
  "HCI / Interaction Designer",
  "Brand Designer",
  "Student",
  "Other",
] as const;

export const DESIGN_INTERESTS = [
  "Product Design",
  "UX",
  "UI",
  "Interaction Design",
  "Design Systems",
  "Typography",
  "Motion",
  "Branding",
  "Creative Coding",
  "Generative Design",
  "3D",
  "Web Design",
  "Mobile Design",
  "Data Visualization",
  "Prototyping",
] as const;

export const AESTHETICS = [
  "Minimal",
  "Editorial",
  "Experimental",
  "Brutalist",
  "Futuristic",
  "Organic",
  "Playful",
  "Maximalist",
  "Swiss",
  "Industrial",
  "Cinematic",
  "Soft",
  "Monochrome",
  "Retro",
  "Surreal",
] as const;

export const CREATIVE_MEDIUMS = [
  "Websites",
  "Apps",
  "Film",
  "Photography",
  "Music",
  "Architecture",
  "Fashion",
  "Art",
  "Typography",
  "Editorial",
  "Motion",
  "Generative Art",
  "Creative Coding",
  "Games",
] as const;

export const PROJECT_FOCUS_AREAS = [
  "UX",
  "UI",
  "Interaction",
  "Visual identity",
  "Motion",
  "Creative technology",
  "Prototype",
  "Other",
] as const;

export type DesignerRole = (typeof DESIGNER_ROLES)[number];
export type DesignInterest = (typeof DESIGN_INTERESTS)[number];
export type Aesthetic = (typeof AESTHETICS)[number];
export type CreativeMedium = (typeof CREATIVE_MEDIUMS)[number];
export type ProjectFocusArea = (typeof PROJECT_FOCUS_AREAS)[number];

import type { CSSProperties } from "react";

/** Visual treatments for aesthetic mood cards */
export const AESTHETIC_VISUALS: Record<
  Aesthetic,
  { label: string; style: CSSProperties }
> = {
  Minimal: {
    label: "Aa",
    style: {
      background: "linear-gradient(180deg, #f7f7f5 0%, #e8e8e4 100%)",
      color: "#0c0c0c",
      fontFamily: "var(--font-display), sans-serif",
      fontWeight: 600,
      letterSpacing: "-0.04em",
    },
  },
  Editorial: {
    label: "Ed",
    style: {
      background:
        "repeating-linear-gradient(0deg, transparent, transparent 11px, rgba(12,12,12,0.08) 11px, rgba(12,12,12,0.08) 12px), #f0ebe3",
      color: "#1a1a1a",
      fontFamily: "Georgia, 'Times New Roman', serif",
      fontStyle: "italic",
    },
  },
  Experimental: {
    label: "×",
    style: {
      background:
        "linear-gradient(135deg, #0c0c0c 0%, #0c0c0c 40%, #002fa7 40%, #002fa7 60%, #f4f4f2 60%)",
      color: "#f4f4f2",
      fontWeight: 700,
    },
  },
  Brutalist: {
    label: "B",
    style: {
      background: "#0c0c0c",
      color: "#f4f4f2",
      fontFamily: "var(--font-display), sans-serif",
      fontWeight: 800,
      border: "3px solid #f4f4f2",
      boxShadow: "4px 4px 0 #f4f4f2",
    },
  },
  Futuristic: {
    label: "01",
    style: {
      background:
        "linear-gradient(160deg, #061018 0%, #0a2a3a 50%, #002fa7 100%)",
      color: "#9ad7ff",
      fontFamily: "ui-monospace, monospace",
      letterSpacing: "0.12em",
    },
  },
  Organic: {
    label: "ø",
    style: {
      background:
        "radial-gradient(ellipse at 30% 40%, #c8d5b9 0%, #a3b18a 45%, #588157 100%)",
      color: "#1b4332",
      fontFamily: "Georgia, serif",
    },
  },
  Playful: {
    label: "!",
    style: {
      background:
        "linear-gradient(45deg, #ffe66d 25%, #ff6b6b 25%, #ff6b6b 50%, #4ecdc4 50%, #4ecdc4 75%, #ffe66d 75%)",
      color: "#0c0c0c",
      fontWeight: 800,
    },
  },
  Maximalist: {
    label: "M+",
    style: {
      background:
        "conic-gradient(from 30deg, #e63946, #f4a261, #2a9d8f, #264653, #e63946)",
      color: "#fff",
      fontWeight: 800,
      textShadow: "0 1px 2px rgba(0,0,0,0.4)",
    },
  },
  Swiss: {
    label: "CH",
    style: {
      background: "#fff",
      color: "#e30613",
      fontFamily: "Helvetica, Arial, sans-serif",
      fontWeight: 700,
      borderBottom: "4px solid #0c0c0c",
    },
  },
  Industrial: {
    label: "I",
    style: {
      background:
        "repeating-linear-gradient(90deg, #3d3d3d, #3d3d3d 2px, #2a2a2a 2px, #2a2a2a 8px)",
      color: "#c4c4c0",
      fontFamily: "ui-monospace, monospace",
      fontWeight: 600,
    },
  },
  Cinematic: {
    label: "∙∙",
    style: {
      background:
        "linear-gradient(180deg, #111 0%, #1a1208 40%, #3d2914 100%)",
      color: "#e8d5a3",
      letterSpacing: "0.2em",
      boxShadow: "inset 0 0 0 8px #0c0c0c",
    },
  },
  Soft: {
    label: "·",
    style: {
      background:
        "radial-gradient(circle at 50% 60%, #fce8e8 0%, #e8d5e8 50%, #d5e0f0 100%)",
      color: "#6b5b6b",
      fontWeight: 300,
    },
  },
  Monochrome: {
    label: "█",
    style: {
      background: "linear-gradient(90deg, #0c0c0c 50%, #f4f4f2 50%)",
      color: "transparent",
      backgroundClip: "unset",
    },
  },
  Retro: {
    label: "′78",
    style: {
      background:
        "linear-gradient(180deg, #f2c94c 0%, #f2c94c 33%, #eb5757 33%, #eb5757 66%, #2d9cdb 66%)",
      color: "#0c0c0c",
      fontFamily: "Georgia, serif",
      fontWeight: 700,
    },
  },
  Surreal: {
    label: "◉",
    style: {
      background:
        "radial-gradient(circle at 70% 30%, #ff9f1c 0%, transparent 35%), radial-gradient(circle at 30% 70%, #2ec4b6 0%, transparent 40%), #1b1b3a",
      color: "#ffbfd3",
    },
  },
};

/** Map onboarding labels → existing interest_tags slugs for recsys */
export const ONBOARDING_TO_INTEREST_SLUGS: Record<string, string[]> = {
  Typography: ["typography"],
  Motion: ["motion-graphics"],
  "Product Design": ["product-design"],
  Minimal: ["minimalist-design"],
  Brutalist: ["brutalism"],
  Film: ["film-stills", "experimental-film"],
  Photography: ["editorial-photography"],
  Music: ["lo-fi", "ambient-sound", "jazz", "analog-synth"],
  Architecture: ["architecture"],
  Fashion: ["fashion-editorial", "street-style"],
  Editorial: ["editorial-photography", "zine-culture"],
  Art: ["collage", "watercolor", "ceramics"],
  "Generative Art": ["collage"],
  Branding: ["product-design"],
};
