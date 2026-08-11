import Link from "next/link";
import { AuthButtons } from "@/components/auth-buttons";

type AuthPageProps = {
  mode: "signup" | "login";
  nextPath?: string;
  error?: string;
};

export function AuthPage({ mode, nextPath, error }: AuthPageProps) {
  const isSignup = mode === "signup";

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage: `
            radial-gradient(ellipse 80% 60% at 80% 10%, rgba(155, 176, 182, 0.5) 0%, transparent 55%),
            radial-gradient(ellipse 50% 40% at 10% 90%, rgba(42, 107, 99, 0.16) 0%, transparent 50%),
            linear-gradient(165deg, #f2f6f7 0%, #dce7ea 45%, #c8d8dc 100%)
          `,
        }}
      />

      <main className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
        <Link
          href="/"
          className="animate-rise font-[family-name:var(--font-display)] text-3xl font-bold tracking-[-0.03em] text-ink transition-opacity hover:opacity-70"
        >
          Wisp
        </Link>

        <h1 className="animate-rise-delay-1 mt-10 font-[family-name:var(--font-display)] text-4xl font-semibold tracking-[-0.03em] text-ink">
          {isSignup ? "Create your account" : "Welcome back"}
        </h1>
        <p className="animate-rise-delay-1 mt-3 text-base leading-relaxed text-ink/65">
          {isSignup
            ? "Connect Spotify or Are.na to start weaving ideas across mediums."
            : "Log in with the same Spotify or Are.na account you used to sign up."}
        </p>

        {error ? (
          <p
            className="animate-rise-delay-1 mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <div className="animate-rise-delay-2 mt-10">
          <AuthButtons mode={mode} nextPath={nextPath} />
        </div>

        <p className="animate-rise-delay-2 mt-8 text-sm text-ink/55">
          {isSignup ? (
            <>
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-medium text-klein underline-offset-4 hover:underline"
              >
                Log in
              </Link>
            </>
          ) : (
            <>
              New to Wisp?{" "}
              <Link
                href="/signup"
                className="font-medium text-klein underline-offset-4 hover:underline"
              >
                Sign up
              </Link>
            </>
          )}
        </p>
      </main>
    </div>
  );
}
