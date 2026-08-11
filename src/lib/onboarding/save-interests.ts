"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  INTEREST_CATALOG,
  type InterestSlug,
} from "@/lib/onboarding/interests";

const VALID_SLUGS = new Set(INTEREST_CATALOG.map((t) => t.slug));

export type SaveInterestsResult =
  | { ok: true; interestCount: number }
  | { ok: false; error: string };

function isMissingRelation(message: string) {
  return /relation .* does not exist|Could not find the table|schema cache/i.test(
    message,
  );
}

/**
 * Persists onboarding interests for the signed-in user.
 * Source of truth for recsys: user_interest_preferences + user_interest_events.
 * Also mirrors onto profiles (when present) and auth user_metadata.
 */
export async function saveOnboardingInterests(
  slugs: string[],
): Promise<SaveInterestsResult> {
  const unique = [...new Set(slugs)].filter((s): s is InterestSlug =>
    VALID_SLUGS.has(s as InterestSlug),
  );

  if (unique.length === 0) {
    return { ok: false, error: "Pick at least one interest to continue." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Sign in with Google to continue." };
  }

  const labels = INTEREST_CATALOG.filter((t) =>
    unique.includes(t.slug as InterestSlug),
  ).map((t) => t.label);

  // 1) Try atomic RPC when full schema is present
  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "save_onboarding_interests",
    { interest_slugs: unique },
  );

  if (!rpcError) {
    await syncUserMetadata(user.id, unique, user.user_metadata);
    const interestCount =
      typeof rpcData === "object" &&
      rpcData !== null &&
      "interest_count" in rpcData &&
      typeof (rpcData as { interest_count: unknown }).interest_count === "number"
        ? (rpcData as { interest_count: number }).interest_count
        : unique.length;
    return { ok: true, interestCount };
  }

  // 2) Direct writes — preferences/events are required; profiles is best-effort
  const direct = await saveInterestsDirect(user.id, unique, labels, user);
  if (direct.ok) {
    return direct;
  }

  if (isMissingRelation(`${rpcError.message} ${direct.error}`)) {
    return {
      ok: false,
      error:
        "Database schema is incomplete. Run supabase/bootstrap.sql in the Supabase SQL Editor, then try again.",
    };
  }

  return { ok: false, error: direct.error || rpcError.message };
}

async function syncUserMetadata(
  userId: string,
  slugs: string[],
  existingMetadata: Record<string, unknown> | undefined,
) {
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, {
    user_metadata: {
      ...(existingMetadata ?? {}),
      interest_slugs: slugs,
      onboarding_completed: true,
    },
  });
  if (error) {
    throw error;
  }
}

async function saveInterestsDirect(
  userId: string,
  slugs: InterestSlug[],
  labels: string[],
  user: {
    email?: string | null;
    user_metadata?: Record<string, unknown>;
    app_metadata?: Record<string, unknown>;
  },
): Promise<SaveInterestsResult> {
  try {
    const admin = createAdminClient();
    const now = new Date().toISOString();

    const { data: tags, error: tagsError } = await admin
      .from("interest_tags")
      .select("id, slug, label")
      .in("slug", slugs)
      .eq("is_active", true);

    if (tagsError) {
      return { ok: false, error: tagsError.message };
    }

    if (!tags || tags.length === 0) {
      return {
        ok: false,
        error:
          "Interest taxonomy is empty. Run supabase/bootstrap.sql in the Supabase SQL Editor.",
      };
    }

    if (tags.length !== slugs.length) {
      return { ok: false, error: "One or more interest slugs are invalid." };
    }

    const interestIds = tags.map((t) => t.id as string);

    // --- preferences + events (required) ---
    const { data: existing } = await admin
      .from("user_interest_preferences")
      .select("interest_id, weight")
      .eq("user_id", userId)
      .eq("source", "onboarding");

    const selectedSet = new Set(interestIds);
    const removed =
      existing?.filter((row) => !selectedSet.has(row.interest_id as string)) ??
      [];

    if (removed.length > 0) {
      await admin.from("user_interest_events").insert(
        removed.map((row) => ({
          user_id: userId,
          interest_id: row.interest_id,
          event_type: "deselect",
          weight: row.weight ?? 1,
          source: "onboarding",
          occurred_at: now,
          metadata: { reason: "onboarding_replace" },
        })),
      );

      await admin
        .from("user_interest_preferences")
        .delete()
        .eq("user_id", userId)
        .eq("source", "onboarding")
        .in(
          "interest_id",
          removed.map((r) => r.interest_id),
        );
    }

    const { error: prefError } = await admin
      .from("user_interest_preferences")
      .upsert(
        interestIds.map((interestId) => ({
          user_id: userId,
          interest_id: interestId,
          weight: 1,
          signal_type: "explicit",
          source: "onboarding",
          selected_at: now,
          updated_at: now,
        })),
        { onConflict: "user_id,interest_id" },
      );

    if (prefError) {
      return { ok: false, error: prefError.message };
    }

    const { error: eventError } = await admin
      .from("user_interest_events")
      .insert(
        interestIds.map((interestId) => ({
          user_id: userId,
          interest_id: interestId,
          event_type: "select",
          weight: 1,
          source: "onboarding",
          occurred_at: now,
          metadata: { step: "onboarding_interests" },
        })),
      );

    if (eventError) {
      return { ok: false, error: eventError.message };
    }

    // --- profiles mirror (optional until bootstrap is applied) ---
    const provider =
      typeof user.app_metadata?.provider === "string"
        ? user.app_metadata.provider
        : "google";

    const { error: profileError } = await admin.from("profiles").upsert(
      {
        id: userId,
        email: user.email ?? null,
        display_name:
          (user.user_metadata?.full_name as string | undefined) ||
          (user.user_metadata?.name as string | undefined) ||
          null,
        avatar_url:
          (user.user_metadata?.avatar_url as string | undefined) ||
          (user.user_metadata?.picture as string | undefined) ||
          null,
        providers: [provider],
        interests: labels,
        onboarding_completed: true,
        updated_at: now,
      },
      { onConflict: "id" },
    );

    if (profileError && !isMissingRelation(profileError.message)) {
      return { ok: false, error: profileError.message };
    }

    // Always keep completion + slugs on the auth user so the app can proceed
    await syncUserMetadata(userId, slugs, user.user_metadata);

    return { ok: true, interestCount: interestIds.length };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to save interests",
    };
  }
}
