"use client";

import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

type TextInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export function TextInput({ label, id, className = "", ...props }: TextInputProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");
  return (
    <label className="block" htmlFor={inputId}>
      <span className="text-[0.7rem] font-medium uppercase tracking-[0.12em] text-ink/45">
        {label}
      </span>
      <input
        id={inputId}
        className={[
          "mt-2 w-full rounded-md border border-ink/15 bg-white/70 px-4 py-3 text-base text-ink outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-ink/35 focus:border-klein/50 focus:ring-1 focus:ring-klein/30",
          className,
        ].join(" ")}
        {...props}
      />
    </label>
  );
}

type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
};

export function TextArea({ label, id, className = "", ...props }: TextAreaProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");
  return (
    <label className="block" htmlFor={inputId}>
      <span className="text-[0.7rem] font-medium uppercase tracking-[0.12em] text-ink/45">
        {label}
      </span>
      <textarea
        id={inputId}
        className={[
          "mt-2 min-h-[7rem] w-full resize-y rounded-md border border-ink/15 bg-white/70 px-4 py-3 text-base leading-relaxed text-ink outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-ink/35 focus:border-klein/50 focus:ring-1 focus:ring-klein/30",
          className,
        ].join(" ")}
        {...props}
      />
    </label>
  );
}
