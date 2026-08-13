import Link from "next/link";

/** Simple top bar for the graphs home (list) page. */
export function DashboardHomeNav() {
  return (
    <header className="relative z-30 flex shrink-0 items-center justify-between border-b border-ink/10 bg-paper px-6 py-4 sm:px-10">
      <Link
        href="/"
        className="font-[family-name:var(--font-display)] text-xl font-bold tracking-[-0.03em] text-ink"
      >
        wisp.
      </Link>
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
