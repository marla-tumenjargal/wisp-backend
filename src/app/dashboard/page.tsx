import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profileResult = await supabase
    .from("profiles")
    .select("display_name, avatar_url, providers")
    .eq("id", user.id)
    .maybeSingle();

  const profile = profileResult.error ? null : profileResult.data;

  const displayName =
    profile?.display_name ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email ||
    "Creator";

  const providers: string[] = profile?.providers ?? [
    user.app_metadata?.provider,
  ].filter(Boolean);

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage: `
            radial-gradient(ellipse 80% 60% at 70% 0%, rgba(155, 176, 182, 0.45) 0%, transparent 55%),
            linear-gradient(165deg, #f2f6f7 0%, #dce7ea 50%, #c8d8dc 100%)
          `,
        }}
      />

      <header className="relative z-10 flex items-center justify-between px-6 py-6 sm:px-12">
        <Link
          href="/"
          className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-[-0.03em] text-ink"
        >
          Wisp
        </Link>
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="rounded-md border border-ink/15 bg-white/50 px-4 py-2 text-sm font-medium text-ink backdrop-blur-sm transition-colors hover:bg-white/80"
          >
            Log out
          </button>
        </form>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-6 pb-20">
        <p className="text-sm font-medium uppercase tracking-[0.14em] text-klein">
          Signed in
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-semibold tracking-[-0.03em] text-ink sm:text-5xl">
          Hello, {displayName}
        </h1>
        <p className="mt-4 max-w-lg text-base leading-relaxed text-ink/65">
          Your account is stored in Supabase. Connected providers:{" "}
          {providers.length > 0
            ? providers
                .map((p) =>
                  p === "custom:pinterest" || p === "pinterest"
                    ? "Pinterest"
                    : p.charAt(0).toUpperCase() + p.slice(1),
                )
                .join(", ")
            : "none yet"}
          .
        </p>
        {user.email ? (
          <p className="mt-2 text-sm text-ink/50">{user.email}</p>
        ) : null}
      </main>
    </div>
  );
}
