import { redirect } from "next/navigation";
import { DashboardHomeNav } from "@/components/dashboard-home-nav";
import { GraphHome } from "@/components/graph-home";
import { listGraphs } from "@/lib/graphs/queries";
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

  let graphs: Awaited<ReturnType<typeof listGraphs>> = [];
  let schemaError: string | null = null;

  try {
    graphs = await listGraphs(supabase, user.id);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load graphs";
    if (/relation .* does not exist|schema cache/i.test(message)) {
      schemaError =
        "Run supabase/migrations/008_graphs.sql in the Supabase SQL editor to enable multiple graphs.";
    } else {
      schemaError = message;
    }
  }

  const withCounts = await Promise.all(
    graphs.map(async (graph) => {
      const [{ count: nodeCount }, { count: edgeCount }] = await Promise.all([
        supabase
          .from("vault_nodes")
          .select("*", { count: "exact", head: true })
          .eq("graph_id", graph.id),
        supabase
          .from("vault_edges")
          .select("*", { count: "exact", head: true })
          .eq("graph_id", graph.id),
      ]);
      return {
        ...graph,
        node_count: nodeCount ?? 0,
        edge_count: edgeCount ?? 0,
      };
    }),
  );

  return (
    <div className="flex min-h-dvh flex-col bg-paper text-ink">
      <DashboardHomeNav />
      {schemaError ? (
        <div className="mx-auto max-w-xl px-6 py-16 text-center">
          <p className="text-sm text-red-700">{schemaError}</p>
        </div>
      ) : (
        <GraphHome initialGraphs={withCounts} />
      )}
    </div>
  );
}
