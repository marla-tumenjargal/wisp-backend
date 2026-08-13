import { redirect } from "next/navigation";
import { GraphWorkspaceNav } from "@/components/graph-workspace-nav";
import { VaultSection } from "@/components/vault-section";
import { displayGraphName } from "@/lib/graphs/types";
import { getGraph } from "@/lib/graphs/queries";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ graphId: string }> };

export default async function GraphVaultPage({ params }: Props) {
  const { graphId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/onboarding");

  const graph = await getGraph(supabase, user.id, graphId);
  if (!graph) redirect("/dashboard");

  const vaultSync = graph.vault_synced_at
    ? {
        node_count: graph.vault_node_count,
        edge_count: graph.vault_edge_count,
        synced_at: graph.vault_synced_at,
        vault_name: graph.vault_name,
      }
    : null;

  return (
    <div className="flex min-h-dvh flex-col bg-paper text-ink">
      <GraphWorkspaceNav
        graphId={graph.id}
        graphName={graph.name}
        graphFocus={graph.creating || graph.focus}
        current="vault"
      />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12 sm:px-10">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-[-0.03em]">
          vault
        </h1>
        <p className="mt-2 text-sm text-ink/55">
          Upload an Obsidian zip into{" "}
          <span className="text-ink">{displayGraphName(graph)}</span>.
        </p>
        <div className="mt-10">
          <VaultSection graphId={graph.id} initialSync={vaultSync} />
        </div>
      </main>
    </div>
  );
}
