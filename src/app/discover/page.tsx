import { DiscoverFeedView } from "@/components/discover/discover-feed";
import { generateDiscoverFeed } from "@/lib/recsys/pipeline";
import { createClient } from "@/lib/supabase/server";

export default async function DiscoverPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  let feed;
  try {
    feed = await generateDiscoverFeed(supabase, user.id);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not load recommendations.";
    return (
      <div className="max-w-lg py-16">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-[-0.03em]">
          Discover
        </h1>
        <p className="mt-4 text-ink/60">{message}</p>
        <p className="mt-2 text-sm text-ink/45">
          If tables are missing, run supabase/migrations/013_discover_recsys.sql.
        </p>
      </div>
    );
  }

  return <DiscoverFeedView initial={feed} />;
}
