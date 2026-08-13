import Link from "next/link";

const links = [
  { href: "/dashboard", label: "feed" },
  { href: "/dashboard/graph", label: "graph" },
  { href: "/dashboard/vault", label: "vault" },
] as const;

type DashboardNavProps = {
  current?: (typeof links)[number]["href"];
};

export function DashboardNav({ current = "/dashboard" }: DashboardNavProps) {
  return (
    <header className="relative z-30 flex shrink-0 items-center justify-between border-b border-ink/10 bg-paper px-6 py-4 sm:px-10">
      <Link
        href="/"
        className="font-[family-name:var(--font-display)] text-xl font-bold tracking-[-0.03em] text-ink"
      >
        wisp.
      </Link>

      <nav aria-label="Dashboard">
        <ul className="flex items-center gap-6 text-[0.8rem] font-medium tracking-[0.06em] lowercase sm:gap-8">
          {links.map((link) => {
            const active = current === link.href;
            return (
              <li key={link.href}>
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

      <form action="/auth/signout" method="post">
        <button
          type="submit"
          className="text-[0.8rem] font-medium tracking-[0.06em] text-ink/45 transition-opacity hover:text-ink hover:opacity-100"
        >
          log out
        </button>
      </form>
    </header>
  );
}
