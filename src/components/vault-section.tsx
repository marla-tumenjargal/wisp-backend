"use client";

import { useState } from "react";
import { VaultConnect } from "@/components/vault-connect";
import { VaultSummary } from "@/components/vault-summary";

export type VaultSyncState = {
  node_count: number;
  edge_count: number;
  synced_at: string;
  vault_name: string | null;
} | null;

type VaultSectionProps = {
  initialSync: VaultSyncState;
};

export function VaultSection({ initialSync }: VaultSectionProps) {
  const [sync, setSync] = useState<VaultSyncState>(initialSync);
  const [resyncing, setResyncing] = useState(false);

  if (!sync || resyncing) {
    return (
      <VaultConnect
        mode={sync ? "resync" : "connect"}
        onCancel={sync ? () => setResyncing(false) : undefined}
        onSuccess={(summary) => {
          setSync(summary);
          setResyncing(false);
        }}
      />
    );
  }

  return (
    <VaultSummary
      nodeCount={sync.node_count}
      edgeCount={sync.edge_count}
      syncedAt={sync.synced_at}
      vaultName={sync.vault_name}
      onResync={() => setResyncing(true)}
    />
  );
}
