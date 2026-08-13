import Link from "next/link";
import { displayGraphName } from "@/lib/graphs/types";

type GraphWorkspaceNavProps = {
  graphId: string;
  graphName: string | null;
  graphFocus?: string | null;
  current: "feed" | "graph" | "vault";
};

export function GraphWorkspaceNav({
  graphId,
  graphName,
  graphFocus = null,
  current,
}: GraphWorkspaceNavProps) {
  const base = `/dashboard/graphs/${graphId}`;
  const links = [
    { key: "feed" as const, href: base, label: "feed" },
    { key: "graph" as const, href: `${base}/graph`, label: "graph" },
    { key: "vault" as const, href: `${base}/vault`, label: "vault" },
  ];

  return (
    <header className="relative z-30 flex shrink-0 items-center justify-between border-b border-ink/10 bg-paper px-6 py-4 sm:px-10">
      <div className="flex min-w-0 items-center gap-4">
        <Link
          href="/dashboard"
          className="font-[family-name:var(--font-display)] text-xl font-bold tracking-[-0.03em] text-ink"
        >
          wisp.
        </Link>
        <span className="hidden text-ink/20 sm:inline" aria-hidden>
          /
        </span>
        <Link
          href="/dashboard"
          className="hidden max-w-[14rem] truncate text-[0.8rem] text-ink/45 hover:text-ink sm:inline"
          title="Back to all graphs"
        >
          {displayGraphName({ name: graphName, focus: graphFocus })}
        </Link>
      </div>

      <nav aria-label="Graph workspace">
        <ul className="flex items-center gap-6 text-[0.8rem] font-medium tracking-[0.06em] lowercase sm:gap-8">
          {links.map((link) => {
            const active = current === link.key;
            return (
              <li key={link.key}>
                <Link
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={[
                    "relative transition-opacity hover:opacity-100",
                    active ? "opacity-100" : "opacity-45",
                  ].join(" ")}
                >
                  {link.label}
                  {active ? (
                    <span
                      aria-hidden
                      className="absolute -bottom-1 left-0 h-px w-full bg-ink"
                    />
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <Link
        href="/dashboard"
        className="text-[0.8rem] font-medium tracking-[0.06em] text-ink/45 transition-opacity hover:text-ink"
      >
        graphs
      </Link>
    </header>
  );
}
