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
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-ink/10 bg-paper/90 px-6 py-4 backdrop-blur-md sm:px-10 lg:px-12">
        <Link
          href="/discover"
          className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-[-0.03em]"
        >
          wisp.
        </Link>
        <div className="flex items-center gap-6">
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

      <div className="mx-auto flex w-full max-w-[1680px]">
        <aside className="sticky top-[65px] hidden h-[calc(100dvh-65px)] w-56 shrink-0 flex-col border-r border-ink/8 px-6 py-10 lg:flex">
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
                        "block py-2.5 text-[1rem] tracking-wide transition-colors",
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
            className="mt-auto inline-flex h-11 items-center justify-center rounded-md bg-klein text-sm font-medium tracking-wide text-white transition-colors hover:bg-klein-deep"
          >
            Create →
          </Link>
        </aside>

        <div className="min-w-0 flex-1 px-5 py-8 pb-28 sm:px-8 md:px-10 lg:px-12 lg:py-10 lg:pb-12">
          {children}
        </div>
      </div>

      <nav
        aria-label="Studio mobile"
        className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-ink/10 bg-paper/95 px-2 py-2.5 backdrop-blur lg:hidden"
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
                "px-2 py-1 text-[0.75rem] tracking-[0.04em]",
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
