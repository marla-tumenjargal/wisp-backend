import { redirect } from "next/navigation";
import { ArenaSuggestions } from "@/components/arena-suggestions";
import { DashboardNav } from "@/components/dashboard-nav";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/onboarding");
  }

  const profileResult = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", user.id)
    .maybeSingle();

  const profile = profileResult.error ? null : profileResult.data;
  const onboardingDone =
    Boolean(profile?.onboarding_completed) ||
    Boolean(user.user_metadata?.onboarding_completed);

  if (!onboardingDone) {
    redirect("/onboarding?step=interests");
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-paper text-ink">
      <DashboardNav current="/dashboard" />
      <ArenaSuggestions />
    </div>
  );
}
