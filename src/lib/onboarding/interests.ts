export type InterestDomain =
  | "design"
  | "audio"
  | "visual"
  | "film"
  | "culture";

export type InterestDefinition = {
  slug: string;
  label: string;
  domain: InterestDomain;
};

/** Canonical taxonomy — slug is the stable ID for models / feature stores. */
export const INTEREST_CATALOG: InterestDefinition[] = [
  { slug: "minimalist-design", label: "minimalist design", domain: "design" },
  { slug: "lo-fi", label: "lo-fi", domain: "audio" },
  { slug: "editorial-photography", label: "editorial photography", domain: "visual" },
  { slug: "ambient-sound", label: "ambient sound", domain: "audio" },
  { slug: "typography", label: "typography", domain: "design" },
  { slug: "brutalism", label: "brutalism", domain: "design" },
  { slug: "film-stills", label: "film stills", domain: "film" },
  { slug: "collage", label: "collage", domain: "visual" },
  { slug: "architecture", label: "architecture", domain: "design" },
  { slug: "street-style", label: "street style", domain: "culture" },
  { slug: "ceramics", label: "ceramics", domain: "visual" },
  { slug: "jazz", label: "jazz", domain: "audio" },
  { slug: "experimental-film", label: "experimental film", domain: "film" },
  { slug: "product-design", label: "product design", domain: "design" },
  { slug: "watercolor", label: "watercolor", domain: "visual" },
  { slug: "zine-culture", label: "zine culture", domain: "culture" },
  { slug: "motion-graphics", label: "motion graphics", domain: "visual" },
  { slug: "analog-synth", label: "analog synth", domain: "audio" },
  { slug: "fashion-editorial", label: "fashion editorial", domain: "culture" },
  { slug: "documentary", label: "documentary", domain: "film" },
];

/** @deprecated use INTEREST_CATALOG — kept as label list for display helpers */
export const INTEREST_TAGS = INTEREST_CATALOG.map((t) => t.label);

export type InterestTag = (typeof INTEREST_CATALOG)[number]["label"];
export type InterestSlug = (typeof INTEREST_CATALOG)[number]["slug"];

export const ONBOARDING_STEPS = ["account", "interests"] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export function labelToSlug(label: string): string | undefined {
  return INTEREST_CATALOG.find((t) => t.label === label)?.slug;
}

export function slugToLabel(slug: string): string | undefined {
  return INTEREST_CATALOG.find((t) => t.slug === slug)?.label;
}
