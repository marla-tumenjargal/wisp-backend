"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  AUTH_PROVIDERS,
  type AuthProviderId,
} from "@/lib/auth/providers";

type AuthButtonsProps = {
  mode: "signup" | "login";
  nextPath?: string;
};

export function AuthButtons({
  mode,
  nextPath = "/onboarding?step=interests",
}: AuthButtonsProps) {
  const [loading, setLoading] = useState<AuthProviderId | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function signIn(provider: AuthProviderId) {
    setLoading(provider);
    setError(null);

    const supabase = createClient();
    const origin = window.location.origin;
    const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;

    const scopes =
      provider === "spotify"
        ? "user-read-email user-read-private"
        : provider === "custom:arena"
          ? "read"
          : undefined;

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: provider as any,
      options: {
        redirectTo,
        ...(scopes ? { scopes } : {}),
        ...(provider === "google"
          ? {
              queryParams: {
                access_type: "offline",
                prompt: "select_account",
              },
            }
          : {}),
      },
    });

    if (oauthError) {
      setError(oauthError.message);
      setLoading(null);
    }
  }

  return (
    <div className="flex w-full flex-col gap-3">
      {AUTH_PROVIDERS.map((provider) => (
        <button
          key={provider.id}
          type="button"
          disabled={loading !== null}
          onClick={() => signIn(provider.id)}
          className={[
            "inline-flex h-12 w-full items-center justify-center gap-3 rounded-md border px-5 text-[0.95rem] font-medium tracking-wide transition-[background-color,border-color,transform,opacity] duration-200 active:scale-[0.98] disabled:cursor-wait disabled:opacity-60",
            provider.brand === "google"
              ? "border-ink/15 bg-white text-ink hover:bg-white/80"
              : provider.brand === "spotify"
                ? "border-[#1DB954]/30 bg-[#1DB954] text-white hover:bg-[#1aa34a]"
                : "border-ink/20 bg-ink text-paper hover:bg-ink/90",
          ].join(" ")}
        >
          {provider.brand === "google" ? (
            <GoogleIcon />
          ) : provider.brand === "spotify" ? (
            <SpotifyIcon />
          ) : (
            <ArenaIcon />
          )}
          {loading === provider.id
            ? "Redirecting…"
            : mode === "signup"
              ? provider.label.replace("Continue", "Sign up")
              : provider.label}
        </button>
      ))}

      {error ? (
        <p className="mt-1 text-sm text-red-700/90" role="alert">
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

function SpotifyIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  );
}

function ArenaIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M12 2L2 7.5V16.5L12 22L22 16.5V7.5L12 2ZM12 4.2L19.5 8.3V15.7L12 19.8L4.5 15.7V8.3L12 4.2ZM12 7L8 14H10.2L10.9 12.2H13.1L13.8 14H16L12 7ZM12 9.3L12.8 11H11.2L12 9.3Z" />
    </svg>
  );
}
