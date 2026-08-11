import Link from "next/link";
import { redirect } from "next/navigation";
import { ArenaSuggestions } from "@/components/arena-suggestions";
import { VaultSection } from "@/components/vault-section";
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
    .select("display_name, avatar_url, onboarding_completed")
    .eq("id", user.id)
    .maybeSingle();

  const profile = profileResult.error ? null : profileResult.data;
  const onboardingDone =
    Boolean(profile?.onboarding_completed) ||
    Boolean(user.user_metadata?.onboarding_completed);

  if (!onboardingDone) {
    redirect("/onboarding?step=interests");
  }

  const displayName =
    profile?.display_name ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email ||
    "Creator";

  const { data: prefs } = await supabase
    .from("user_interest_preferences")
    .select("weight, source, interest_tags(slug, label, domain)")
    .eq("user_id", user.id)
    .order("selected_at", { ascending: true });

  const interests =
    prefs
      ?.map((row) => {
        const tag = row.interest_tags as
          | { slug: string; label: string; domain: string }
          | { slug: string; label: string; domain: string }[]
          | null;
        if (!tag) return null;
        const resolved = Array.isArray(tag) ? tag[0] : tag;
        if (!resolved) return null;
        return {
          slug: resolved.slug,
          label: resolved.label,
          domain: resolved.domain,
          weight: row.weight as number,
        };
      })
      .filter(
        (item): item is { slug: string; label: string; domain: string; weight: number } =>
          Boolean(item),
      ) ?? [];

  const vaultSyncResult = await supabase
    .from("vault_syncs")
    .select("node_count, edge_count, synced_at, vault_name")
    .eq("user_id", user.id)
    .maybeSingle();

  const vaultSync =
    vaultSyncResult.error || !vaultSyncResult.data
      ? null
      : {
          node_count: vaultSyncResult.data.node_count as number,
          edge_count: vaultSyncResult.data.edge_count as number,
          synced_at: vaultSyncResult.data.synced_at as string,
          vault_name: (vaultSyncResult.data.vault_name as string | null) ?? null,
        };

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-paper text-ink">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/3 bg-klein md:block"
      />

      <header className="relative z-10 flex items-center justify-between px-8 py-7 sm:px-12">
        <Link
          href="/"
          className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-[-0.03em] text-ink"
        >
          wisp.
        </Link>
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="rounded-md border border-ink/15 bg-white/70 px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-white"
          >
            Log out
          </button>
        </form>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-12 px-8 pb-20 sm:px-12 lg:mx-0 lg:max-w-3xl lg:px-16">
        <section>
          <p className="text-sm font-medium tracking-[0.12em] text-klein lowercase">
            signed in
          </p>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-bold tracking-[-0.03em] text-ink sm:text-5xl">
            hello, {displayName}
          </h1>
          {user.email ? (
            <p className="mt-2 text-sm text-ink/50">{user.email}</p>
          ) : null}

          {interests.length > 0 ? (
            <div className="mt-8">
              <p className="text-sm text-ink/50">your interests</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {interests.map((tag) => (
                  <span
                    key={tag.slug}
                    className="rounded-md border border-ink/10 bg-white/80 px-3 py-1.5 text-sm text-ink/80"
                    title={`${tag.domain} · weight ${tag.weight}`}
                  >
                    {tag.label}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        <section>
          <VaultSection initialSync={vaultSync} />
        </section>

        <section>
          <ArenaSuggestions />
        </section>
      </main>
    </div>
  );
}
