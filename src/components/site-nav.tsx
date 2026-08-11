import Link from "next/link";

const links = [
  { href: "/", label: "home" },
  { href: "/login", label: "log in / sign up" },
  { href: "/about", label: "about" },
  { href: "/developer", label: "developer" },
] as const;

type SiteNavProps = {
  current?: (typeof links)[number]["href"];
  /** "split" uses difference blend so links stay readable over paper and Klein blue */
  variant?: "split" | "plain";
};

export function SiteNav({ current = "/", variant = "plain" }: SiteNavProps) {
  return (
    <nav
      aria-label="Primary"
      className={[
        "animate-nav-in absolute inset-x-0 top-0 z-20 flex justify-center px-6 pt-7 sm:pt-8",
        variant === "split" ? "mix-blend-difference text-white" : "text-ink",
      ].join(" ")}
    >
      <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[0.8rem] font-medium tracking-[0.06em] lowercase sm:gap-x-10 sm:text-[0.85rem]">
        {links.map((link) => {
          const active = current === link.href;

          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={[
                  "relative transition-opacity duration-200 hover:opacity-100",
                  active ? "opacity-100" : "opacity-55",
                ].join(" ")}
              >
                {link.label}
                {active ? (
                  <span
                    aria-hidden
                    className="absolute -bottom-1.5 left-0 h-px w-full bg-current"
                  />
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
