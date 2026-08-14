import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function ConnectionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("spotify_connected, pinterest_connected, obsidian_connected, providers")
    .eq("id", user.id)
    .maybeSingle();

  const providers = Array.isArray(profile?.providers)
    ? (profile.providers as string[])
    : [];
  const spotify =
    Boolean(profile?.spotify_connected) ||
    providers.some((p) => String(p).includes("spotify"));

  const sources = [
    {
      name: "Spotify",
      connected: spotify,
      note: spotify
        ? "Linked to your account. Listening history is not ingested yet."
        : "Not connected. Wisp will not invent listening data.",
    },
    {
      name: "Pinterest",
      connected: Boolean(profile?.pinterest_connected),
      note: "Adapter is ready. No Pinterest API credentials are configured.",
    },
    {
      name: "Obsidian",
      connected: Boolean(profile?.obsidian_connected),
      note: "Upload a vault from a project workspace — there is no cloud API.",
    },
  ];

  return (
    <div className="max-w-xl">
      <p className="text-[0.7rem] font-medium uppercase tracking-[0.14em] text-ink/40">
        Sources
      </p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl font-bold tracking-[-0.03em]">
        Connections
      </h1>
      <p className="mt-3 text-ink/55">
        Recommendations currently come from Wisp&apos;s curated catalog. External
        adapters can replace it later without changing the ranking pipeline.
      </p>

      <ul className="mt-10 space-y-4">
        {sources.map((s) => (
          <li
            key={s.name}
            className="rounded-md border border-ink/10 bg-white/60 px-5 py-4"
          >
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
                {s.name}
              </h2>
              <span className="text-[0.7rem] uppercase tracking-[0.1em] text-ink/40">
                {s.connected ? "Connected" : "Not connected"}
              </span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-ink/55">{s.note}</p>
          </li>
        ))}
      </ul>

      <Link
        href="/discover"
        className="mt-10 inline-block text-sm text-ink/50 hover:text-ink"
      >
        ← Discover
      </Link>
    </div>
  );
}
