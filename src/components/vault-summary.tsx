"use client";

type VaultSummaryProps = {
  nodeCount: number;
  edgeCount: number;
  syncedAt: string;
  vaultName?: string | null;
  onResync: () => void;
};

export function VaultSummary({
  nodeCount,
  edgeCount,
  syncedAt,
  vaultName,
  onResync,
}: VaultSummaryProps) {
  const syncedLabel = new Date(syncedAt).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="rounded-md border border-ink/10 bg-white/70 p-5 backdrop-blur-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium tracking-[0.08em] text-klein lowercase">
            vault connected
          </p>
          <h3 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-[-0.02em] text-ink">
            {vaultName || "Obsidian vault"}
          </h3>
          <p className="mt-2 text-sm text-ink/55">Last synced {syncedLabel}</p>
        </div>
        <button
          type="button"
          onClick={onResync}
          className="rounded-md border border-ink/15 bg-paper px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-white"
        >
          Re-sync
        </button>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-4">
        <div>
          <dt className="text-xs uppercase tracking-[0.12em] text-ink/45">nodes</dt>
          <dd className="mt-1 font-[family-name:var(--font-display)] text-3xl font-semibold text-ink">
            {nodeCount}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-[0.12em] text-ink/45">edges</dt>
          <dd className="mt-1 font-[family-name:var(--font-display)] text-3xl font-semibold text-ink">
            {edgeCount}
          </dd>
        </div>
      </dl>
    </div>
  );
}
