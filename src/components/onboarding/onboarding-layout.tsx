"use client";

import Link from "next/link";
import type { ReactNode } from "react";

type OnboardingLayoutProps = {
  children: ReactNode;
  brandHref?: string;
};

export function OnboardingLayout({
  children,
  brandHref = "/",
}: OnboardingLayoutProps) {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-paper text-ink">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          backgroundImage: `
            radial-gradient(ellipse 70% 50% at 100% 0%, rgba(0, 47, 167, 0.08) 0%, transparent 55%),
            radial-gradient(ellipse 50% 40% at 0% 100%, rgba(12, 12, 12, 0.04) 0%, transparent 50%)
          `,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 hidden w-[32%] bg-klein md:block"
      />
      <header className="relative z-10 px-6 pt-8 sm:px-10 lg:px-14">
        <Link
          href={brandHref}
          className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-[-0.03em] text-ink transition-opacity hover:opacity-70"
        >
          wisp.
        </Link>
      </header>
      <main className="relative z-10 mx-auto w-full max-w-3xl px-6 py-12 sm:px-10 lg:px-14 lg:py-16">
        {children}
      </main>
    </div>
  );
}
