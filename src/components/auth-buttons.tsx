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

export function AuthButtons({ mode, nextPath = "/dashboard" }: AuthButtonsProps) {
  const [loading, setLoading] = useState<AuthProviderId | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function signIn(provider: AuthProviderId) {
    setLoading(provider);
    setError(null);

    const supabase = createClient();
    const origin = window.location.origin;
    const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        scopes:
          provider === "spotify"
            ? "user-read-email user-read-private"
            : "user_accounts:read",
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
            provider.brand === "spotify"
              ? "border-[#1DB954]/30 bg-[#1DB954] text-white hover:bg-[#1aa34a]"
              : "border-[#E60023]/25 bg-[#E60023] text-white hover:bg-[#c4001d]",
          ].join(" ")}
        >
          {provider.brand === "spotify" ? <SpotifyIcon /> : <PinterestIcon />}
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

function SpotifyIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  );
}

function PinterestIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.219-.937 1.407-5.968 1.407-5.968s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.888-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12.001 24c6.624 0 11.999-5.373 11.999-12C24 5.372 18.626.001 12.001.001z" />
    </svg>
  );
}
