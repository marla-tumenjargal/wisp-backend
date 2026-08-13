import { redirect } from "next/navigation";
import { DashboardNav } from "@/components/dashboard-nav";
import { VaultSection } from "@/components/vault-section";
import { createClient } from "@/lib/supabase/server";

export default async function VaultPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/onboarding");

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
          vault_name:
            (vaultSyncResult.data.vault_name as string | null) ?? null,
        };

  return (
    <div className="flex min-h-dvh flex-col bg-paper text-ink">
      <DashboardNav current="/dashboard/vault" />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12 sm:px-10">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-[-0.03em]">
          vault
        </h1>
        <p className="mt-2 text-sm text-ink/55">
          Upload an Obsidian zip to seed your knowledge graph.
        </p>
        <div className="mt-10">
          <VaultSection initialSync={vaultSync} />
        </div>
      </main>
    </div>
  );
}
