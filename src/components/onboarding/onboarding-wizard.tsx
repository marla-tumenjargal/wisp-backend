"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AestheticMoodCard } from "@/components/onboarding/aesthetic-mood-card";
import { PrimaryButton, SecondaryButton } from "@/components/onboarding/buttons";
import { IntegrationCard } from "@/components/onboarding/integration-card";
import { ProgressIndicator } from "@/components/onboarding/progress-indicator";
import { SelectionCard, SelectionGrid } from "@/components/onboarding/selection";
import { StepTransition } from "@/components/onboarding/step-transition";
import { TextArea, TextInput } from "@/components/onboarding/text-input";
import {
  AESTHETICS,
  CREATIVE_MEDIUMS,
  DESIGN_INTERESTS,
  DESIGNER_ROLES,
  PROJECT_FOCUS_AREAS,
  type Aesthetic,
  type CreativeMedium,
  type DesignerRole,
  type DesignInterest,
} from "@/lib/onboarding/catalog";
import {
  completeOnboarding,
  saveOnboardingProgress,
  saveOnboardingProject,
} from "@/lib/onboarding/save-progress";
import {
  nextStep,
  prevStep,
  type OnboardingFlowStep,
  type OnboardingState,
} from "@/lib/onboarding/types";
import { createClient } from "@/lib/supabase/client";

type OnboardingWizardProps = {
  initialState: OnboardingState;
  displayName?: string | null;
  providers?: string[];
};

function toggleValue<T extends string>(list: T[], value: T): T[] {
  return list.includes(value)
    ? list.filter((v) => v !== value)
    : [...list, value];
}

function summarize(items: string[], fallback: string): string {
  if (items.length === 0) return fallback;
  if (items.length <= 2) return items.join(" / ");
  return `${items.slice(0, 2).join(" / ")} +${items.length - 2}`;
}

export function OnboardingWizard({
  initialState,
  displayName,
  providers = [],
}: OnboardingWizardProps) {
  const router = useRouter();
  const [state, setState] = useState<OnboardingState>(initialState);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Record<string, string | null>>({});
  const [skippedIntegrations, setSkippedIntegrations] = useState<Set<string>>(
    () => new Set(),
  );
  const [connecting, setConnecting] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const step = state.step;
  const spotifyLinked =
    state.spotifyConnected ||
    providers.some((p) => p === "spotify" || p.includes("spotify"));

  async function persist(
    next: OnboardingFlowStep,
    patch: Partial<{
      designerRoles: DesignerRole[];
      designInterests: DesignInterest[];
      aesthetics: Aesthetic[];
      creativeMediums: CreativeMedium[];
      spotifyConnected: boolean;
      pinterestConnected: boolean;
      obsidianConnected: boolean;
    }> = {},
  ) {
    const result = await saveOnboardingProgress({
      step: next,
      designerRoles: patch.designerRoles ?? state.designerRoles,
      designInterests: patch.designInterests ?? state.designInterests,
      aesthetics: patch.aesthetics ?? state.aesthetics,
      creativeMediums: patch.creativeMediums ?? state.creativeMediums,
      spotifyConnected: patch.spotifyConnected ?? state.spotifyConnected,
      pinterestConnected: patch.pinterestConnected ?? state.pinterestConnected,
      obsidianConnected: patch.obsidianConnected ?? state.obsidianConnected,
    });
    return result;
  }

  function goForward(overrides?: Partial<OnboardingState>) {
    const merged = { ...state, ...overrides };
    const destination = nextStep(merged.step);
    if (!destination) return;

    setError(null);
    startTransition(async () => {
      const result = await persist(destination, {
        designerRoles: merged.designerRoles,
        designInterests: merged.designInterests,
        aesthetics: merged.aesthetics,
        creativeMediums: merged.creativeMediums,
        spotifyConnected: merged.spotifyConnected,
        pinterestConnected: merged.pinterestConnected,
        obsidianConnected: merged.obsidianConnected,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setState({ ...merged, step: destination });
    });
  }

  function goBack() {
    const destination = prevStep(step);
    if (!destination) return;
    setError(null);
    startTransition(async () => {
      const result = await persist(destination);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setState((prev) => ({ ...prev, step: destination }));
    });
  }

  function skipTo(destination: OnboardingFlowStep) {
    setError(null);
    startTransition(async () => {
      const result = await persist(destination);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setState((prev) => ({ ...prev, step: destination }));
    });
  }

  function saveProjectAndContinue() {
    setError(null);
    startTransition(async () => {
      const result = await saveOnboardingProject({
        name: state.project.name,
        description: state.project.description,
        focusAreas: state.project.focusAreas,
        existingProjectId: state.project.projectId,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setState((prev) => ({
        ...prev,
        step: "connect",
        project: { ...prev.project, projectId: result.projectId },
      }));
    });
  }

  async function connectSpotify() {
    setConnecting("spotify");
    setNotice((n) => ({ ...n, spotify: null }));
    setError(null);

    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent("/onboarding")}`;

    const { error: linkError } = await supabase.auth.linkIdentity({
      provider: "spotify",
      options: {
        redirectTo,
        scopes: "user-read-email user-read-private user-top-read",
      },
    });

    if (linkError) {
      setNotice((n) => ({
        ...n,
        spotify:
          "Spotify linking isn’t available yet for this account. You can skip and connect later.",
      }));
      setConnecting(null);
      return;
    }
  }

  function connectPinterest() {
    setNotice((n) => ({
      ...n,
      pinterest:
        "Pinterest connection isn’t available yet. Skip for now — your other preferences are enough.",
    }));
  }

  function connectObsidian() {
    setNotice((n) => ({
      ...n,
      obsidian:
        "Obsidian vaults can be uploaded from your project workspace after onboarding.",
    }));
  }

  function skipIntegration(id: string) {
    setSkippedIntegrations((prev) => new Set(prev).add(id));
    setNotice((n) => ({ ...n, [id]: null }));
  }

  function finish() {
    setError(null);
    startTransition(async () => {
      const result = await completeOnboarding({
        designerRoles: state.designerRoles,
        designInterests: state.designInterests,
        aesthetics: state.aesthetics,
        creativeMediums: state.creativeMediums,
        spotifyConnected: spotifyLinked,
        pinterestConnected: state.pinterestConnected,
        obsidianConnected: state.obsidianConnected,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push("/discover");
      router.refresh();
    });
  }

  const nav = (
    <div className="mt-10 flex flex-wrap items-center gap-3">
      {prevStep(step) ? (
        <SecondaryButton disabled={isPending} onClick={goBack}>
          Back
        </SecondaryButton>
      ) : null}
      {step !== "welcome" &&
      step !== "finish" &&
      step !== "project" &&
      step !== "connect" ? (
        <PrimaryButton
          disabled={isPending}
          onClick={() => goForward()}
        >
          {isPending ? "Saving…" : "Continue"}
        </PrimaryButton>
      ) : null}
      {step !== "welcome" &&
      step !== "finish" &&
      step !== "project" &&
      step !== "connect" ? (
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            const destination = nextStep(step);
            if (destination) skipTo(destination);
          }}
          className="text-sm text-ink/45 transition-colors hover:text-ink/70 disabled:opacity-40"
        >
          Skip
        </button>
      ) : null}
    </div>
  );

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col">
      <ProgressIndicator step={step} />

      <StepTransition stepKey={step}>
        {step === "welcome" ? (
          <section>
            <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold tracking-[-0.03em] text-ink sm:text-5xl">
              Welcome to Wisp.
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-ink/70">
              A creative space for discovering inspiration and turning ideas into
              design.
            </p>
            <p className="mt-4 max-w-md text-base leading-relaxed text-ink/55">
              Wisp learns how you think, what inspires you, and what you&apos;re
              designing to help you discover unexpected creative directions.
            </p>
            {displayName ? (
              <p className="mt-6 text-sm text-ink/45">Signed in as {displayName}</p>
            ) : null}
            <div className="mt-10">
              <PrimaryButton
                disabled={isPending}
                onClick={() => goForward()}
              >
                {isPending ? "Saving…" : "Let's get started →"}
              </PrimaryButton>
            </div>
          </section>
        ) : null}

        {step === "about" ? (
          <section>
            <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold tracking-[-0.03em] text-ink sm:text-5xl">
              What kind of designer are you?
            </h1>
            <p className="mt-4 text-base text-ink/55">Select all that apply.</p>
            <SelectionGrid label="Designer roles">
              {DESIGNER_ROLES.map((role) => (
                <SelectionCard
                  key={role}
                  label={role}
                  selected={state.designerRoles.includes(role)}
                  onToggle={() =>
                    setState((prev) => ({
                      ...prev,
                      designerRoles: toggleValue(prev.designerRoles, role),
                    }))
                  }
                />
              ))}
            </SelectionGrid>
            {nav}
          </section>
        ) : null}

        {step === "interests" ? (
          <section>
            <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold tracking-[-0.03em] text-ink sm:text-5xl">
              What do you like designing?
            </h1>
            <p className="mt-4 max-w-md text-base leading-relaxed text-ink/55">
              Choose anything you want Wisp to learn about you.
            </p>
            <SelectionGrid label="Design interests">
              {DESIGN_INTERESTS.map((interest) => (
                <SelectionCard
                  key={interest}
                  label={interest}
                  selected={state.designInterests.includes(interest)}
                  onToggle={() =>
                    setState((prev) => ({
                      ...prev,
                      designInterests: toggleValue(
                        prev.designInterests,
                        interest,
                      ),
                    }))
                  }
                />
              ))}
            </SelectionGrid>
            {nav}
          </section>
        ) : null}

        {step === "aesthetic" ? (
          <section>
            <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold tracking-[-0.03em] text-ink sm:text-5xl">
              What kind of visual worlds pull you in?
            </h1>
            <p className="mt-4 text-base text-ink/55">
              Build a small moodboard of aesthetics that feel like you.
            </p>
            <SelectionGrid label="Visual aesthetics" columns="mood">
              {AESTHETICS.map((aesthetic) => (
                <AestheticMoodCard
                  key={aesthetic}
                  aesthetic={aesthetic}
                  selected={state.aesthetics.includes(aesthetic)}
                  onToggle={() =>
                    setState((prev) => ({
                      ...prev,
                      aesthetics: toggleValue(prev.aesthetics, aesthetic),
                    }))
                  }
                />
              ))}
            </SelectionGrid>
            {nav}
          </section>
        ) : null}

        {step === "mediums" ? (
          <section>
            <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold tracking-[-0.03em] text-ink sm:text-5xl">
              Where do you find inspiration?
            </h1>
            <p className="mt-4 max-w-md text-base leading-relaxed text-ink/55">
              Wisp can connect ideas across mediums.
            </p>
            <SelectionGrid label="Creative mediums">
              {CREATIVE_MEDIUMS.map((medium) => (
                <SelectionCard
                  key={medium}
                  label={medium}
                  selected={state.creativeMediums.includes(medium)}
                  onToggle={() =>
                    setState((prev) => ({
                      ...prev,
                      creativeMediums: toggleValue(
                        prev.creativeMediums,
                        medium,
                      ),
                    }))
                  }
                />
              ))}
            </SelectionGrid>
            {nav}
          </section>
        ) : null}

        {step === "project" ? (
          <section>
            <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold tracking-[-0.03em] text-ink sm:text-5xl">
              What are you working on?
            </h1>
            <p className="mt-4 max-w-md text-base leading-relaxed text-ink/55">
              Create your first Wisp project — or skip and start later.
            </p>

            <div className="mt-8 space-y-5">
              <TextInput
                label="Project name"
                placeholder="e.g. Music discovery app"
                value={state.project.name}
                onChange={(e) =>
                  setState((prev) => ({
                    ...prev,
                    project: { ...prev.project, name: e.target.value },
                  }))
                }
              />
              <TextArea
                label="What are you trying to make?"
                placeholder="Tell Wisp what you're designing..."
                value={state.project.description}
                onChange={(e) =>
                  setState((prev) => ({
                    ...prev,
                    project: { ...prev.project, description: e.target.value },
                  }))
                }
              />
              <div>
                <p className="text-[0.7rem] font-medium uppercase tracking-[0.12em] text-ink/45">
                  What are you exploring?
                </p>
                <SelectionGrid label="Project focus areas">
                  {PROJECT_FOCUS_AREAS.map((area) => (
                    <SelectionCard
                      key={area}
                      label={area}
                      selected={state.project.focusAreas.includes(area)}
                      onToggle={() =>
                        setState((prev) => ({
                          ...prev,
                          project: {
                            ...prev.project,
                            focusAreas: toggleValue(
                              prev.project.focusAreas,
                              area,
                            ),
                          },
                        }))
                      }
                    />
                  ))}
                </SelectionGrid>
              </div>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <SecondaryButton disabled={isPending} onClick={goBack}>
                Back
              </SecondaryButton>
              <PrimaryButton
                disabled={
                  isPending ||
                  !state.project.name.trim() ||
                  !state.project.description.trim()
                }
                onClick={saveProjectAndContinue}
              >
                {isPending ? "Saving…" : "Continue"}
              </PrimaryButton>
              <button
                type="button"
                disabled={isPending}
                onClick={() => skipTo("connect")}
                className="text-sm text-ink/45 transition-colors hover:text-ink/70 disabled:opacity-40"
              >
                Skip for now
              </button>
            </div>
          </section>
        ) : null}

        {step === "connect" ? (
          <section>
            <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold tracking-[-0.03em] text-ink sm:text-5xl">
              Bring in what already inspires you.
            </h1>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-ink/55">
              Wisp can use your existing interests to find more relevant creative
              references.
            </p>

            <div className="mt-8 grid gap-4">
              <IntegrationCard
                name="Spotify"
                title="Connect Spotify"
                description="Use your listening history to discover creative connections across music, mood, and visual design."
                status={spotifyLinked ? "connected" : "idle"}
                busy={connecting === "spotify"}
                notice={notice.spotify}
                onConnect={() => void connectSpotify()}
                onSkip={() => skipIntegration("spotify")}
              />
              <IntegrationCard
                name="Pinterest"
                title="Connect Pinterest"
                description="Bring your saved visual references into Wisp."
                status={state.pinterestConnected ? "connected" : "idle"}
                notice={
                  skippedIntegrations.has("pinterest")
                    ? "Skipped for now."
                    : notice.pinterest
                }
                onConnect={connectPinterest}
                onSkip={() => skipIntegration("pinterest")}
              />
              <IntegrationCard
                name="Obsidian"
                title="Connect Obsidian"
                description="Connect your existing ideas and notes to your Wisp workspace."
                status={state.obsidianConnected ? "connected" : "idle"}
                notice={
                  skippedIntegrations.has("obsidian")
                    ? "Skipped for now."
                    : notice.obsidian
                }
                onConnect={connectObsidian}
                onSkip={() => skipIntegration("obsidian")}
              />
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <SecondaryButton disabled={isPending} onClick={goBack}>
                Back
              </SecondaryButton>
              <PrimaryButton
                disabled={isPending}
                onClick={() => goForward()}
              >
                {isPending ? "Saving…" : "Continue"}
              </PrimaryButton>
              <button
                type="button"
                disabled={isPending}
                onClick={() => skipTo("finish")}
                className="text-sm text-ink/45 transition-colors hover:text-ink/70 disabled:opacity-40"
              >
                Skip all
              </button>
            </div>
          </section>
        ) : null}

        {step === "finish" ? (
          <section>
            <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold tracking-[-0.03em] text-ink sm:text-5xl">
              Your creative world is ready.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-ink/60">
              Wisp will use what you&apos;ve shared to help you discover new
              references, connections, and design directions.
            </p>

            <div className="mt-10 max-w-xs space-y-0 font-[family-name:var(--font-display)]">
              <SummaryBlock
                label="Designer"
                value={summarize(state.designerRoles, "Open")}
              />
              <SummaryArrow />
              <SummaryBlock
                label="Interests"
                value={summarize(state.designInterests, "Exploring")}
              />
              <SummaryArrow />
              <SummaryBlock
                label="Aesthetic"
                value={summarize(state.aesthetics, "Emerging")}
              />
              <SummaryArrow />
              <div className="pt-1">
                <p className="text-[0.65rem] font-medium uppercase tracking-[0.14em] text-klein">
                  Wisp
                </p>
              </div>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <SecondaryButton disabled={isPending} onClick={goBack}>
                Back
              </SecondaryButton>
              <PrimaryButton disabled={isPending} onClick={finish}>
                {isPending ? "Entering…" : "Enter Wisp →"}
              </PrimaryButton>
            </div>
          </section>
        ) : null}
      </StepTransition>

      {error ? (
        <p className="mt-6 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function SummaryBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[0.65rem] font-medium uppercase tracking-[0.14em] text-ink/40">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold tracking-[-0.02em] text-ink">
        {value}
      </p>
    </div>
  );
}

function SummaryArrow() {
  return (
    <p className="py-2 text-ink/25" aria-hidden>
      ↓
    </p>
  );
}
