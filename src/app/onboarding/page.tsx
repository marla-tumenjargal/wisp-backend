import Link from "next/link";
import { redirect } from "next/navigation";
import { OnboardingWizard } from "@/components/onboarding-wizard";
import { createClient } from "@/lib/supabase/server";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string; error?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <OnboardingShell error={params.error}>
        <OnboardingWizard initialStep="account" />
      </OnboardingShell>
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("display_name, onboarding_completed")
    .eq("id", user.id)
    .maybeSingle();

  const onboardingDone =
    Boolean(profile?.onboarding_completed) ||
    Boolean(user.user_metadata?.onboarding_completed);

  if (onboardingDone && !profileError) {
    redirect("/dashboard");
  }
  if (onboardingDone && profileError) {
    // profiles table missing but metadata says done — still allow dashboard
    redirect("/dashboard");
  }

  const metaSlugs = Array.isArray(user.user_metadata?.interest_slugs)
    ? (user.user_metadata.interest_slugs as string[])
    : [];

  const { data: prefs } = await supabase
    .from("user_interest_preferences")
    .select("interest_id, interest_tags(slug)")
    .eq("user_id", user.id);

  const initialInterestSlugs =
    prefs
      ?.map((row) => {
        const tag = row.interest_tags as { slug: string } | { slug: string }[] | null;
        if (!tag) return null;
        return Array.isArray(tag) ? tag[0]?.slug : tag.slug;
      })
      .filter((slug): slug is string => Boolean(slug)) ?? metaSlugs;

  return (
    <OnboardingShell error={params.error}>
      <OnboardingWizard
        initialStep="interests"
        userId={user.id}
        displayName={
          profile?.display_name ||
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          null
        }
        initialInterestSlugs={initialInterestSlugs}
      />
    </OnboardingShell>
  );
}

function OnboardingShell({
  children,
  error,
}: {
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-paper text-ink">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 hidden w-[38%] bg-klein md:block"
      />
      <header className="relative z-10 px-8 pt-8 sm:px-12">
        <Link
          href="/"
          className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-[-0.03em] text-ink"
        >
          wisp.
        </Link>
      </header>
      <main className="relative z-10 px-8 py-14 sm:px-12 lg:px-16">
        {error ? (
          <p
            className="mb-6 max-w-md rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
            role="alert"
          >
            {error}
          </p>
        ) : null}
        {children}
      </main>
    </div>
  );
}
