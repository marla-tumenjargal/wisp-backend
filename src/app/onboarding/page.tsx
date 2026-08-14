import { redirect } from "next/navigation";
import { OnboardingLayout } from "@/components/onboarding/onboarding-layout";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import {
  profileToOnboardingState,
  type OnboardingProfileRow,
} from "@/lib/onboarding/types";
import { createClient } from "@/lib/supabase/server";

type ProfileQueryRow = OnboardingProfileRow & {
  providers?: string[] | null;
};

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent("/onboarding")}`);
  }

  let profile: ProfileQueryRow | null = null;
  let profileError: { message: string } | null = null;

  {
    const extended = await supabase
      .from("profiles")
      .select(
        "display_name, providers, onboarding_completed, onboarding_step, designer_roles, design_interests, aesthetics, creative_mediums, current_project_id, spotify_connected, pinterest_connected, obsidian_connected",
      )
      .eq("id", user.id)
      .maybeSingle();

    if (extended.error) {
      const basic = await supabase
        .from("profiles")
        .select("display_name, providers, onboarding_completed")
        .eq("id", user.id)
        .maybeSingle();

      if (basic.error) {
        profileError = basic.error;
      } else if (basic.data) {
        profile = {
          ...(basic.data as ProfileQueryRow),
          onboarding_step:
            typeof user.user_metadata?.onboarding_step === "string"
              ? user.user_metadata.onboarding_step
              : "welcome",
          designer_roles: Array.isArray(user.user_metadata?.designer_roles)
            ? (user.user_metadata.designer_roles as string[])
            : [],
          design_interests: Array.isArray(user.user_metadata?.design_interests)
            ? (user.user_metadata.design_interests as string[])
            : [],
          aesthetics: Array.isArray(user.user_metadata?.aesthetics)
            ? (user.user_metadata.aesthetics as string[])
            : [],
          creative_mediums: Array.isArray(user.user_metadata?.creative_mediums)
            ? (user.user_metadata.creative_mediums as string[])
            : [],
          current_project_id: null,
          spotify_connected: false,
          pinterest_connected: false,
          obsidian_connected: false,
        };
      }
    } else {
      profile = extended.data as ProfileQueryRow | null;
    }
  }

  const onboardingDone =
    Boolean(profile?.onboarding_completed) ||
    Boolean(user.user_metadata?.onboarding_completed);

  if (onboardingDone) {
    redirect("/dashboard");
  }

  const meta = user.user_metadata ?? {};
  const resolvedProfile: OnboardingProfileRow | null = profileError
    ? {
        display_name:
          (meta.full_name as string | undefined) ||
          (meta.name as string | undefined) ||
          null,
        onboarding_completed: false,
        onboarding_step:
          typeof meta.onboarding_step === "string"
            ? meta.onboarding_step
            : "welcome",
        designer_roles: Array.isArray(meta.designer_roles)
          ? (meta.designer_roles as string[])
          : [],
        design_interests: Array.isArray(meta.design_interests)
          ? (meta.design_interests as string[])
          : [],
        aesthetics: Array.isArray(meta.aesthetics)
          ? (meta.aesthetics as string[])
          : [],
        creative_mediums: Array.isArray(meta.creative_mediums)
          ? (meta.creative_mediums as string[])
          : [],
        current_project_id: null,
        spotify_connected: false,
        pinterest_connected: false,
        obsidian_connected: false,
      }
    : profile;

  let project: {
    name?: string | null;
    description?: string | null;
    creating?: string | null;
    focus_areas?: string[] | null;
  } | null = null;

  if (resolvedProfile?.current_project_id) {
    const { data } = await supabase
      .from("graphs")
      .select("name, description, creating, focus_areas")
      .eq("id", resolvedProfile.current_project_id)
      .eq("user_id", user.id)
      .maybeSingle();
    project = data;
  }

  const initialState = profileToOnboardingState(resolvedProfile, project);

  const providersFromProfile = Array.isArray(
    (profile as ProfileQueryRow | null)?.providers,
  )
    ? ((profile as ProfileQueryRow).providers ?? [])
    : [];
  const providersFromAuth = Array.isArray(user.app_metadata?.providers)
    ? (user.app_metadata.providers as string[])
    : typeof user.app_metadata?.provider === "string"
      ? [user.app_metadata.provider]
      : [];
  const providers = [...new Set([...providersFromProfile, ...providersFromAuth])];

  if (
    providers.some((p) => p === "spotify" || String(p).includes("spotify"))
  ) {
    initialState.spotifyConnected = true;
  }

  const displayName =
    resolvedProfile?.display_name ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    null;

  return (
    <OnboardingLayout>
      {params.error ? (
        <p
          className="mb-6 max-w-md rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          role="alert"
        >
          {params.error}
        </p>
      ) : null}
      <OnboardingWizard
        initialState={initialState}
        displayName={displayName}
        providers={providers}
      />
    </OnboardingLayout>
  );
}
