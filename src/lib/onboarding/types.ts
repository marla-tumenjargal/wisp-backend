import type {
  Aesthetic,
  CreativeMedium,
  DesignerRole,
  DesignInterest,
  ProjectFocusArea,
} from "@/lib/onboarding/catalog";

export const ONBOARDING_FLOW_STEPS = [
  "welcome",
  "about",
  "interests",
  "aesthetic",
  "mediums",
  "project",
  "connect",
  "finish",
] as const;

export type OnboardingFlowStep = (typeof ONBOARDING_FLOW_STEPS)[number];

export type OnboardingProjectDraft = {
  name: string;
  description: string;
  focusAreas: ProjectFocusArea[];
  projectId: string | null;
};

export type OnboardingState = {
  designerRoles: DesignerRole[];
  designInterests: DesignInterest[];
  aesthetics: Aesthetic[];
  creativeMediums: CreativeMedium[];
  project: OnboardingProjectDraft;
  spotifyConnected: boolean;
  pinterestConnected: boolean;
  obsidianConnected: boolean;
  step: OnboardingFlowStep;
  onboardingCompleted: boolean;
};

export type OnboardingProfileRow = {
  designer_roles: string[] | null;
  design_interests: string[] | null;
  aesthetics: string[] | null;
  creative_mediums: string[] | null;
  current_project_id: string | null;
  spotify_connected: boolean | null;
  pinterest_connected: boolean | null;
  obsidian_connected: boolean | null;
  onboarding_step: string | null;
  onboarding_completed: boolean | null;
  display_name: string | null;
};

export function isOnboardingFlowStep(value: string): value is OnboardingFlowStep {
  return (ONBOARDING_FLOW_STEPS as readonly string[]).includes(value);
}

export function stepIndex(step: OnboardingFlowStep): number {
  return ONBOARDING_FLOW_STEPS.indexOf(step);
}

export function nextStep(step: OnboardingFlowStep): OnboardingFlowStep | null {
  const i = stepIndex(step);
  if (i < 0 || i >= ONBOARDING_FLOW_STEPS.length - 1) return null;
  return ONBOARDING_FLOW_STEPS[i + 1]!;
}

export function prevStep(step: OnboardingFlowStep): OnboardingFlowStep | null {
  const i = stepIndex(step);
  if (i <= 0) return null;
  return ONBOARDING_FLOW_STEPS[i - 1]!;
}

export function emptyOnboardingState(
  overrides?: Partial<OnboardingState>,
): OnboardingState {
  return {
    designerRoles: [],
    designInterests: [],
    aesthetics: [],
    creativeMediums: [],
    project: {
      name: "",
      description: "",
      focusAreas: [],
      projectId: null,
    },
    spotifyConnected: false,
    pinterestConnected: false,
    obsidianConnected: false,
    step: "welcome",
    onboardingCompleted: false,
    ...overrides,
  };
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string")
    : [];
}

function filterKnown<T extends string>(
  values: string[],
  allowed: readonly T[],
): T[] {
  const set = new Set(allowed);
  return values.filter((v): v is T => set.has(v as T));
}

export function profileToOnboardingState(
  profile: OnboardingProfileRow | null,
  project?: {
    name?: string | null;
    description?: string | null;
    creating?: string | null;
    focus_areas?: string[] | null;
  } | null,
): OnboardingState {
  const stepRaw = profile?.onboarding_step ?? "welcome";
  const step = isOnboardingFlowStep(stepRaw) ? stepRaw : "welcome";

  return emptyOnboardingState({
    designerRoles: filterKnown(
      asStringArray(profile?.designer_roles),
      [
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
      ] as const,
    ),
    designInterests: filterKnown(
      asStringArray(profile?.design_interests),
      [
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
      ] as const,
    ),
    aesthetics: filterKnown(
      asStringArray(profile?.aesthetics),
      [
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
      ] as const,
    ),
    creativeMediums: filterKnown(
      asStringArray(profile?.creative_mediums),
      [
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
      ] as const,
    ),
    project: {
      name: project?.name?.trim() ?? "",
      description:
        project?.description?.trim() ||
        project?.creating?.trim() ||
        "",
      focusAreas: filterKnown(
        asStringArray(project?.focus_areas),
        [
          "UX",
          "UI",
          "Interaction",
          "Visual identity",
          "Motion",
          "Creative technology",
          "Prototype",
          "Other",
        ] as const,
      ),
      projectId: profile?.current_project_id ?? null,
    },
    spotifyConnected: Boolean(profile?.spotify_connected),
    pinterestConnected: Boolean(profile?.pinterest_connected),
    obsidianConnected: Boolean(profile?.obsidian_connected),
    step,
    onboardingCompleted: Boolean(profile?.onboarding_completed),
  });
}
