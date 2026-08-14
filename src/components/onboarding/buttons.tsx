"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type PrimaryButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
};

export function PrimaryButton({
  children,
  className = "",
  ...props
}: PrimaryButtonProps) {
  return (
    <button
      type="button"
      className={[
        "inline-flex h-11 items-center justify-center rounded-md bg-klein px-6 text-[0.95rem] font-medium tracking-wide text-white transition-[background-color,transform,opacity] duration-200 hover:bg-klein-deep active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40",
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}

type SecondaryButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
};

export function SecondaryButton({
  children,
  className = "",
  ...props
}: SecondaryButtonProps) {
  return (
    <button
      type="button"
      className={[
        "inline-flex h-11 items-center justify-center rounded-md border border-ink/15 bg-transparent px-5 text-[0.95rem] font-medium tracking-wide text-ink/70 transition-[border-color,background-color,color,transform,opacity] duration-200 hover:border-ink/30 hover:bg-white/60 hover:text-ink active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40",
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}
