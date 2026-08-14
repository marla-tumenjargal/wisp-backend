import { redirect } from "next/navigation";
import { DiscoverShell } from "@/components/discover/discover-shell";
import { createClient } from "@/lib/supabase/server";

export default async function DiscoverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/discover");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, onboarding_completed")
    .eq("id", user.id)
    .maybeSingle();

  const done =
    Boolean(profile?.onboarding_completed) ||
    Boolean(user.user_metadata?.onboarding_completed);

  if (!done) {
    redirect("/onboarding");
  }

  const displayName =
    profile?.display_name ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    null;

  return (
    <DiscoverShell displayName={displayName}>{children}</DiscoverShell>
  );
}
