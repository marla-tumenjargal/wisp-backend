"use client";

import type { ReactNode } from "react";

type StepTransitionProps = {
  stepKey: string;
  children: ReactNode;
};

export function StepTransition({ stepKey, children }: StepTransitionProps) {
  return (
    <div key={stepKey} className="animate-rise">
      {children}
    </div>
  );
}
