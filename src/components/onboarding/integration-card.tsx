"use client";

type IntegrationStatus = "idle" | "connected" | "unavailable";

type IntegrationCardProps = {
  name: string;
  title: string;
  description: string;
  status: IntegrationStatus;
  busy?: boolean;
  onConnect: () => void;
  onSkip: () => void;
  notice?: string | null;
};

export function IntegrationCard({
  name,
  title,
  description,
  status,
  busy = false,
  onConnect,
  onSkip,
  notice,
}: IntegrationCardProps) {
  const connected = status === "connected";

  return (
    <article className="rounded-md border border-ink/12 bg-white/65 p-5 backdrop-blur-sm">
      <p className="text-[0.65rem] font-medium uppercase tracking-[0.14em] text-ink/40">
        {name}
      </p>
      <h3 className="mt-2 font-[family-name:var(--font-display)] text-xl font-semibold tracking-[-0.02em] text-ink">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-ink/60">{description}</p>

      {notice ? (
        <p className="mt-3 text-sm text-ink/50" role="status">
          {notice}
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {connected ? (
          <span className="inline-flex h-10 items-center rounded-md border border-klein/25 bg-klein/5 px-4 text-sm font-medium text-klein">
            Connected
          </span>
        ) : (
          <button
            type="button"
            disabled={busy || status === "unavailable"}
            onClick={onConnect}
            className="inline-flex h-10 items-center rounded-md bg-ink px-4 text-sm font-medium text-paper transition-[opacity,transform] duration-150 hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? "Connecting…" : "Connect"}
          </button>
        )}
        {!connected ? (
          <button
            type="button"
            disabled={busy}
            onClick={onSkip}
            className="inline-flex h-10 items-center rounded-md px-3 text-sm text-ink/50 transition-colors hover:text-ink disabled:opacity-40"
          >
            Skip
          </button>
        ) : null}
      </div>
    </article>
  );
}
