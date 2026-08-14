"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const NAV = [
  { href: "/discover", label: "Discover" },
  { href: "/dashboard", label: "Projects" },
  { href: "/discover/saved", label: "Saved" },
  { href: "/discover/connections", label: "Connections" },
] as const;

type DiscoverShellProps = {
  children: ReactNode;
  displayName?: string | null;
};

export function DiscoverShell({ children, displayName }: DiscoverShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-dvh bg-paper text-ink">
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-ink/10 bg-paper/90 px-5 py-3 backdrop-blur-md sm:px-8">
        <Link
          href="/discover"
          className="font-[family-name:var(--font-display)] text-xl font-bold tracking-[-0.03em]"
        >
          wisp.
        </Link>
        <div className="flex items-center gap-5">
          <p className="hidden text-sm text-ink/50 sm:block">
            {displayName ?? "Your studio"}
          </p>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="text-[0.75rem] font-medium tracking-[0.06em] text-ink/40 transition-colors hover:text-ink"
            >
              log out
            </button>
          </form>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1400px]">
        <aside className="sticky top-[57px] hidden h-[calc(100dvh-57px)] w-52 shrink-0 flex-col border-r border-ink/8 px-5 py-8 md:flex">
          <nav aria-label="Studio">
            <ul className="space-y-1">
              {NAV.map((item) => {
                const active =
                  item.href === "/discover"
                    ? pathname === "/discover"
                    : pathname === item.href ||
                      pathname.startsWith(`${item.href}/`);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={[
                        "block py-2 text-[0.95rem] tracking-wide transition-colors",
                        active
                          ? "text-ink"
                          : "text-ink/40 hover:text-ink/70",
                      ].join(" ")}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          <Link
            href="/dashboard"
            className="mt-auto inline-flex h-10 items-center justify-center rounded-md bg-klein text-sm font-medium tracking-wide text-white transition-colors hover:bg-klein-deep"
          >
            Create →
          </Link>
        </aside>

        <div className="min-w-0 flex-1 px-5 py-8 sm:px-8 lg:px-10">{children}</div>
      </div>

      <nav
        aria-label="Studio mobile"
        className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-ink/10 bg-paper/95 px-2 py-2 backdrop-blur md:hidden"
      >
        {NAV.map((item) => {
          const active =
            item.href === "/discover"
              ? pathname === "/discover"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "px-2 py-1 text-[0.7rem] tracking-[0.04em]",
                active ? "text-ink" : "text-ink/40",
              ].join(" ")}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
