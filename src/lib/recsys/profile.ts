import { displayGraphName, type GraphRecord } from "@/lib/graphs/types";
import { conceptsForText } from "@/lib/recsys/concepts";
import type {
  ProjectCreativeProfile,
  UserCreativeProfile,
} from "@/lib/recsys/types";
import { tokenize, unique } from "@/lib/recsys/text";

type ProfileSignals = {
  designer_roles?: string[] | null;
  design_interests?: string[] | null;
  aesthetics?: string[] | null;
  creative_mediums?: string[] | null;
};

export function buildUserProfile(
  userId: string,
  profile: ProfileSignals | null,
  tagWeights: Record<string, number> = {},
): UserCreativeProfile {
  const roles = profile?.designer_roles ?? [];
  const interests = profile?.design_interests ?? [];
  const aesthetics = profile?.aesthetics ?? [];
  const mediums = profile?.creative_mediums ?? [];
  const text = [
    "Designer roles:",
    ...roles,
    "Interests:",
    ...interests,
    "Aesthetics:",
    ...aesthetics,
    "Mediums:",
    ...mediums,
  ].join(" ");

  return {
    userId,
    roles,
    interests,
    aesthetics,
    mediums,
    text,
    tokens: unique([
      ...tokenize(text),
      ...interests.map((s) => s.toLowerCase()),
      ...aesthetics.map((s) => s.toLowerCase()),
      ...mediums.map((s) => s.toLowerCase()),
    ]),
    tagWeights,
  };
}

export function buildProjectProfile(
  graph: GraphRecord | null,
): ProjectCreativeProfile {
  if (!graph) return null;
  const name = displayGraphName(graph);
  const description =
    graph.description?.trim() ||
    graph.creating?.trim() ||
    graph.focus?.trim() ||
    "";
  const focusAreas = graph.focus_areas ?? [];
  const text = [
    name,
    description,
    graph.theme,
    graph.goal,
    ...focusAreas,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    id: graph.id,
    name,
    description,
    focusAreas,
    text,
    tokens: unique([...tokenize(text), ...conceptsForText(text)]),
  };
}

/**
 * Text blob for a future embedding model.
 * Keep this the single place that serializes profile → string.
 */
export function profileToEmbeddingInput(
  user: UserCreativeProfile,
  project: ProjectCreativeProfile,
): string {
  const parts = [user.text];
  if (project) {
    parts.push(`Current project: ${project.name}. ${project.description}`);
    if (project.focusAreas.length) {
      parts.push(`Focus: ${project.focusAreas.join(", ")}`);
    }
  }
  return parts.join("\n");
}
