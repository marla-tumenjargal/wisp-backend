"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { INTEREST_CATALOG } from "@/lib/onboarding/interests";
import { saveOnboardingInterests } from "@/lib/onboarding/save-interests";

type OnboardingWizardProps = {
  initialStep: "account" | "interests";
  userId?: string;
  displayName?: string | null;
  /** Stable interest slugs already saved for this user */
  initialInterestSlugs?: string[];
};

export function OnboardingWizard({
  initialStep,
  userId,
  displayName,
  initialInterestSlugs = [],
}: OnboardingWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState<"account" | "interests">(initialStep);
  const [selected, setSelected] = useState<string[]>(initialInterestSlugs);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function signInWithGoogle() {
    setGoogleLoading(true);
    setError(null);

    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent("/onboarding?step=interests")}`;

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: {
          access_type: "offline",
          prompt: "select_account",
        },
      },
    });

    if (oauthError) {
      setError(oauthError.message);
      setGoogleLoading(false);
    }
  }

  function toggleSlug(slug: string) {
    setSelected((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );
  }

  function finishOnboarding() {
    if (!userId) {
      setError("Sign in with Google to continue.");
      setStep("account");
      return;
    }

    if (selected.length === 0) {
      setError("Pick at least one interest to continue.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await saveOnboardingInterests(selected);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    });
  }

  const stepIndex = step === "account" ? 0 : 1;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col">
      <div className="mb-10 flex items-center gap-3">
        {(["account", "interests"] as const).map((s, i) => (
          <div key={s} className="flex items-center gap-3">
            <div
              className={[
                "flex h-7 w-7 items-center justify-center rounded-md text-xs font-semibold tracking-wide",
                i <= stepIndex
                  ? "bg-klein text-white"
                  : "border border-ink/15 bg-white/60 text-ink/40",
              ].join(" ")}
              aria-current={i === stepIndex ? "step" : undefined}
            >
              {i + 1}
            </div>
            {i === 0 ? (
              <div className="h-px w-8 bg-ink/15 sm:w-12" aria-hidden />
            ) : null}
          </div>
        ))}
        <p className="ml-1 text-sm text-ink/50">
          {step === "account" ? "Create account" : "Your interests"}
        </p>
      </div>

      {step === "account" ? (
        <section className="animate-rise">
          <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold tracking-[-0.03em] text-ink sm:text-5xl">
            create your account
          </h1>
          <p className="mt-4 max-w-md text-base leading-relaxed text-ink/65">
            Sign in with Google to start your Wisp profile. You can shape your
            creative world in the next step.
          </p>

          <button
            type="button"
            disabled={googleLoading}
            onClick={signInWithGoogle}
            className="mt-10 inline-flex h-12 w-full max-w-sm items-center justify-center gap-3 rounded-md border border-ink/15 bg-white px-5 text-[0.95rem] font-medium tracking-wide text-ink transition-[background-color,transform,opacity] duration-200 hover:bg-white/80 active:scale-[0.98] disabled:cursor-wait disabled:opacity-60"
          >
            <GoogleIcon />
            {googleLoading ? "Redirecting…" : "Continue with Google"}
          </button>
        </section>
      ) : (
        <section className="animate-rise">
          <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold tracking-[-0.03em] text-ink sm:text-5xl">
            what draws you in?
          </h1>
          <p className="mt-4 max-w-md text-base leading-relaxed text-ink/65">
            {displayName ? `Welcome, ${displayName}. ` : null}
            Pick as many as you like — we&apos;ll use these to expand how you
            create.
          </p>

          <div
            className="mt-8 flex flex-wrap gap-2"
            role="group"
            aria-label="Interest categories"
          >
            {INTEREST_CATALOG.map((tag) => {
              const active = selected.includes(tag.slug);
              return (
                <button
                  key={tag.slug}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleSlug(tag.slug)}
                  className={[
                    "rounded-md border px-3.5 py-2 text-sm tracking-wide transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.98]",
                    active
                      ? "border-klein bg-klein text-white"
                      : "border-ink/15 bg-white/70 text-ink/80 hover:border-ink/30 hover:bg-white",
                  ].join(" ")}
                >
                  {tag.label}
                </button>
              );
            })}
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={isPending || selected.length === 0}
              onClick={finishOnboarding}
              className="inline-flex h-11 items-center justify-center rounded-md bg-klein px-6 text-[0.95rem] font-medium tracking-wide text-white transition-[background-color,transform,opacity] duration-200 hover:bg-klein-deep active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isPending ? "Saving…" : "Finish setup"}
            </button>
            <p className="text-sm text-ink/45">
              {selected.length} selected
            </p>
          </div>
        </section>
      )}

      {error ? (
        <p className="mt-6 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}
