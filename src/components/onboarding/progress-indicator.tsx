"use client";

import {
  ONBOARDING_FLOW_STEPS,
  type OnboardingFlowStep,
  stepIndex,
} from "@/lib/onboarding/types";

const STEP_LABELS: Record<OnboardingFlowStep, string> = {
  welcome: "Welcome",
  about: "About you",
  interests: "Interests",
  aesthetic: "Aesthetic",
  mediums: "Mediums",
  project: "Project",
  connect: "Sources",
  finish: "Ready",
};

type ProgressIndicatorProps = {
  step: OnboardingFlowStep;
};

export function ProgressIndicator({ step }: ProgressIndicatorProps) {
  const current = stepIndex(step);
  const progress = ((current + 1) / ONBOARDING_FLOW_STEPS.length) * 100;

  return (
    <div className="mb-10" aria-label="Onboarding progress">
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-[0.7rem] font-medium uppercase tracking-[0.14em] text-ink/45">
          {String(current + 1).padStart(2, "0")} /{" "}
          {String(ONBOARDING_FLOW_STEPS.length).padStart(2, "0")}
        </p>
        <p className="text-sm text-ink/50">{STEP_LABELS[step]}</p>
      </div>
      <div
        className="mt-3 h-px w-full overflow-hidden bg-ink/10"
        role="progressbar"
        aria-valuenow={current + 1}
        aria-valuemin={1}
        aria-valuemax={ONBOARDING_FLOW_STEPS.length}
        aria-label={STEP_LABELS[step]}
      >
        <div
          className="h-full bg-klein transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
