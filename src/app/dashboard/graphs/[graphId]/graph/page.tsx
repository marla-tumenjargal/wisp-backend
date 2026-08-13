import Link from "next/link";
import { redirect } from "next/navigation";
import { GraphWorkspaceNav } from "@/components/graph-workspace-nav";
import { KnowledgeGraph } from "@/components/knowledge-graph";
import { displayGraphName } from "@/lib/graphs/types";
import { getGraph } from "@/lib/graphs/queries";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ graphId: string }> };

export default async function GraphViewPage({ params }: Props) {
  const { graphId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/onboarding");

  const graph = await getGraph(supabase, user.id, graphId);
  if (!graph) redirect("/dashboard");

  const { data: nodes } = await supabase
    .from("vault_nodes")
    .select("id, title, source, image_url, tags")
    .eq("user_id", user.id)
    .eq("graph_id", graphId)
    .order("created_at", { ascending: false })
    .limit(80);

  const { data: edges } = await supabase
    .from("vault_edges")
    .select("id, source_node_id, target_node_id, edge_type, weight")
    .eq("user_id", user.id)
    .eq("graph_id", graphId)
    .limit(250);

  const graphNodes = (nodes ?? []).map((n) => ({
    id: n.id as string,
    title: n.title as string,
    source: (n.source as string | null) ?? null,
    image_url: (n.image_url as string | null) ?? null,
    tags: (n.tags as string[] | null) ?? null,
  }));

  const graphEdges = (edges ?? []).map((e) => ({
    id: e.id as string,
    source_node_id: e.source_node_id as string,
    target_node_id: e.target_node_id as string,
    edge_type: e.edge_type as string,
    weight: Number(e.weight) || 1,
  }));

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-paper text-ink">
      <GraphWorkspaceNav
        graphId={graph.id}
        graphName={graph.name}
        graphFocus={graph.creating || graph.focus}
        current="graph"
      />
      <div className="flex items-center justify-between border-b border-ink/10 px-6 py-3 sm:px-10">
        <div>
          <p className="text-xs tracking-[0.12em] text-klein lowercase">
            knowledge graph
          </p>
          <p className="mt-0.5 text-sm text-ink/55">
            {displayGraphName(graph)} · {graphNodes.length} nodes ·{" "}
            {graphEdges.length} edges
          </p>
        </div>
        <Link
          href={`/dashboard/graphs/${graphId}`}
          className="text-sm text-ink/50 underline-offset-4 hover:text-ink hover:underline"
        >
          back to feed
        </Link>
      </div>
      <KnowledgeGraph nodes={graphNodes} edges={graphEdges} />
    </div>
  );
}
