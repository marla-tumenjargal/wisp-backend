"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ONBOARDING_TO_INTEREST_SLUGS } from "@/lib/onboarding/catalog";
import {
  isOnboardingFlowStep,
  type OnboardingFlowStep,
} from "@/lib/onboarding/types";

export type SaveResult =
  | { ok: true }
  | { ok: false; error: string };

export type SaveProjectResult =
  | { ok: true; projectId: string }
  | { ok: false; error: string };

function isMissingRelation(message: string) {
  return /relation .* does not exist|Could not find the table|schema cache|column .* does not exist/i.test(
    message,
  );
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null as null };
  return { supabase, user };
}

async function ensureProfileRow(
  userId: string,
  email: string | null | undefined,
  metadata: Record<string, unknown> | undefined,
) {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  await admin.from("profiles").upsert(
    {
      id: userId,
      email: email ?? null,
      display_name:
        (metadata?.full_name as string | undefined) ||
        (metadata?.name as string | undefined) ||
        null,
      avatar_url:
        (metadata?.avatar_url as string | undefined) ||
        (metadata?.picture as string | undefined) ||
        null,
      updated_at: now,
    },
    { onConflict: "id" },
  );
}

export async function saveOnboardingProgress(input: {
  step: OnboardingFlowStep;
  designerRoles?: string[];
  designInterests?: string[];
  aesthetics?: string[];
  creativeMediums?: string[];
  spotifyConnected?: boolean;
  pinterestConnected?: boolean;
  obsidianConnected?: boolean;
}): Promise<SaveResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Sign in to continue." };

  if (!isOnboardingFlowStep(input.step)) {
    return { ok: false, error: "Invalid onboarding step." };
  }

  await ensureProfileRow(user.id, user.email, user.user_metadata);

  const patch: Record<string, unknown> = {
    onboarding_step: input.step,
    updated_at: new Date().toISOString(),
  };

  if (input.designerRoles !== undefined) {
    patch.designer_roles = input.designerRoles;
  }
  if (input.designInterests !== undefined) {
    patch.design_interests = input.designInterests;
  }
  if (input.aesthetics !== undefined) {
    patch.aesthetics = input.aesthetics;
  }
  if (input.creativeMediums !== undefined) {
    patch.creative_mediums = input.creativeMediums;
  }
  if (input.spotifyConnected !== undefined) {
    patch.spotify_connected = input.spotifyConnected;
  }
  if (input.pinterestConnected !== undefined) {
    patch.pinterest_connected = input.pinterestConnected;
  }
  if (input.obsidianConnected !== undefined) {
    patch.obsidian_connected = input.obsidianConnected;
  }

  const { error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", user.id);

  if (error) {
    if (isMissingRelation(error.message)) {
      // Fallback: persist progress on auth metadata when columns missing
      try {
        const admin = createAdminClient();
        await admin.auth.admin.updateUserById(user.id, {
          user_metadata: {
            ...(user.user_metadata ?? {}),
            onboarding_step: input.step,
            designer_roles: input.designerRoles,
            design_interests: input.designInterests,
            aesthetics: input.aesthetics,
            creative_mediums: input.creativeMediums,
          },
        });
        return { ok: true };
      } catch (err) {
        return {
          ok: false,
          error:
            err instanceof Error
              ? err.message
              : "Could not save onboarding progress. Apply migration 012.",
        };
      }
    }
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function saveOnboardingProject(input: {
  name: string;
  description: string;
  focusAreas: string[];
  existingProjectId?: string | null;
}): Promise<SaveProjectResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Sign in to continue." };

  const name = input.name.trim();
  const description = input.description.trim();
  const focusAreas = input.focusAreas.filter(Boolean);

  if (!name) {
    return { ok: false, error: "Give your project a name." };
  }
  if (!description) {
    return { ok: false, error: "Tell Wisp what you're trying to make." };
  }

  const now = new Date().toISOString();
  const focus = [description, focusAreas.join(", ")].filter(Boolean).join(" · ");

  try {
    if (input.existingProjectId) {
      const updated = await updateOrInsertProject(supabase, {
        userId: user.id,
        existingId: input.existingProjectId,
        name,
        description,
        focus,
        focusAreas,
        now,
      });
      if (updated) {
        await supabase
          .from("profiles")
          .update({
            current_project_id: updated,
            onboarding_step: "connect",
            updated_at: now,
          })
          .eq("id", user.id);
        return { ok: true, projectId: updated };
      }
    }

    const created = await updateOrInsertProject(supabase, {
      userId: user.id,
      existingId: null,
      name,
      description,
      focus,
      focusAreas,
      now,
    });

    if (!created) {
      return { ok: false, error: "Failed to create project." };
    }

    await supabase
      .from("profiles")
      .update({
        current_project_id: created,
        onboarding_step: "connect",
        updated_at: now,
      })
      .eq("id", user.id);

    return { ok: true, projectId: created };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save project";
    if (isMissingRelation(message)) {
      return {
        ok: false,
        error:
          "Project tables are missing. Run supabase migrations 008–012, then try again.",
      };
    }
    return { ok: false, error: message };
  }
}

async function updateOrInsertProject(
  supabase: Awaited<ReturnType<typeof createClient>>,
  input: {
    userId: string;
    existingId: string | null;
    name: string;
    description: string;
    focus: string;
    focusAreas: string[];
    now: string;
  },
): Promise<string | null> {
  const withFocusAreas = {
    name: input.name,
    description: input.description,
    creating: input.description,
    focus: input.focus,
    focus_areas: input.focusAreas,
    updated_at: input.now,
  };

  const withoutFocusAreas = {
    name: input.name,
    description: input.description,
    creating: input.description,
    focus: input.focus,
    updated_at: input.now,
  };

  if (input.existingId) {
    let { data, error } = await supabase
      .from("graphs")
      .update(withFocusAreas)
      .eq("id", input.existingId)
      .eq("user_id", input.userId)
      .select("id")
      .maybeSingle();

    if (error && isMissingRelation(error.message)) {
      ({ data, error } = await supabase
        .from("graphs")
        .update(withoutFocusAreas)
        .eq("id", input.existingId)
        .eq("user_id", input.userId)
        .select("id")
        .maybeSingle());
    }

    if (error) throw error;
    return data?.id ?? null;
  }

  let { data, error } = await supabase
    .from("graphs")
    .insert({
      user_id: input.userId,
      ...withFocusAreas,
    })
    .select("id")
    .single();

  if (error && isMissingRelation(error.message)) {
    ({ data, error } = await supabase
      .from("graphs")
      .insert({
        user_id: input.userId,
        ...withoutFocusAreas,
      })
      .select("id")
      .single());
  }

  if (error) throw error;
  return data?.id ?? null;
}

export async function completeOnboarding(input: {
  designerRoles: string[];
  designInterests: string[];
  aesthetics: string[];
  creativeMediums: string[];
  spotifyConnected: boolean;
  pinterestConnected: boolean;
  obsidianConnected: boolean;
}): Promise<SaveResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Sign in to continue." };

  const now = new Date().toISOString();
  await ensureProfileRow(user.id, user.email, user.user_metadata);

  const denormInterests = [
    ...input.designInterests,
    ...input.aesthetics,
    ...input.creativeMediums,
  ];

  const { error } = await supabase
    .from("profiles")
    .update({
      designer_roles: input.designerRoles,
      design_interests: input.designInterests,
      aesthetics: input.aesthetics,
      creative_mediums: input.creativeMediums,
      spotify_connected: input.spotifyConnected,
      pinterest_connected: input.pinterestConnected,
      obsidian_connected: input.obsidianConnected,
      interests: denormInterests,
      onboarding_step: "finish",
      onboarding_completed: true,
      updated_at: now,
    })
    .eq("id", user.id);

  if (error && !isMissingRelation(error.message)) {
    return { ok: false, error: error.message };
  }

  // Best-effort: mirror into interest preference tables for recommendations
  await syncRecsysInterests(user.id, [
    ...input.designInterests,
    ...input.aesthetics,
    ...input.creativeMediums,
  ]);

  try {
    const admin = createAdminClient();
    await admin.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...(user.user_metadata ?? {}),
        onboarding_completed: true,
        onboarding_step: "finish",
        designer_roles: input.designerRoles,
        design_interests: input.designInterests,
        aesthetics: input.aesthetics,
        creative_mediums: input.creativeMediums,
      },
    });
  } catch {
    // Profile write is enough to gate the app
  }

  return { ok: true };
}

async function syncRecsysInterests(userId: string, labels: string[]) {
  const slugs = new Set<string>();
  for (const label of labels) {
    const mapped = ONBOARDING_TO_INTEREST_SLUGS[label];
    if (mapped) for (const s of mapped) slugs.add(s);
  }
  if (slugs.size === 0) return;

  try {
    const admin = createAdminClient();
    const slugList = [...slugs];
    const { data: tags } = await admin
      .from("interest_tags")
      .select("id, slug")
      .in("slug", slugList)
      .eq("is_active", true);

    if (!tags?.length) return;

    const now = new Date().toISOString();
    await admin.from("user_interest_preferences").upsert(
      tags.map((t) => ({
        user_id: userId,
        interest_id: t.id,
        weight: 1,
        signal_type: "explicit",
        source: "onboarding",
        selected_at: now,
        updated_at: now,
      })),
      { onConflict: "user_id,interest_id" },
    );

    await admin.from("user_interest_events").insert(
      tags.map((t) => ({
        user_id: userId,
        interest_id: t.id,
        event_type: "select",
        weight: 1,
        source: "onboarding",
        occurred_at: now,
        metadata: { step: "onboarding_complete" },
      })),
    );
  } catch {
    // Non-blocking — profile completion still succeeds
  }
}
