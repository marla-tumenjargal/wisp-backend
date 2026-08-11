import Link from "next/link";
import { SiteNav } from "@/components/site-nav";

export default function DeveloperPage() {
  return (
    <div className="relative min-h-dvh bg-paper text-ink">
      <SiteNav current="/developer" />
      <main className="mx-auto max-w-2xl px-8 pb-20 pt-28 sm:px-12 sm:pt-32">
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold tracking-[-0.03em] sm:text-5xl">
          developer
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-ink/70">
          Build on Wisp. Auth, identity, and creative connections — APIs and
          docs will live here as the platform grows.
        </p>
        <Link
          href="/"
          className="mt-10 inline-block text-sm font-medium tracking-wide text-klein underline-offset-4 hover:underline"
        >
          back to home
        </Link>
      </main>
    </div>
  );
}
