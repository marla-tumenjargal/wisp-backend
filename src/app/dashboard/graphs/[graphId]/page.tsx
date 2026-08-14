import { redirect } from "next/navigation";
import { ArenaSuggestions } from "@/components/arena-suggestions";
import { GraphWorkspaceNav } from "@/components/graph-workspace-nav";
import { getGraph } from "@/lib/graphs/queries";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ graphId: string }> };

export default async function GraphFeedPage({ params }: Props) {
  const { graphId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/dashboard");

  const graph = await getGraph(supabase, user.id, graphId);
  if (!graph) redirect("/dashboard");

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-paper text-ink">
      <GraphWorkspaceNav
        graphId={graph.id}
        graphName={graph.name}
        graphFocus={graph.creating || graph.focus}
        current="feed"
      />
      <ArenaSuggestions
        graphId={graph.id}
        initialCreating={graph.creating || graph.focus}
        initialTheme={graph.theme}
        initialGoal={graph.goal}
        initialSimilarities={graph.similarities}
        initialReferenceUrl={graph.reference_image_url}
      />
    </div>
  );
}
