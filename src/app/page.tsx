import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden">
      {/* Full-bleed atmospheric plane */}
      <div className="absolute inset-0">
        <Image
          src="/hero.jpg"
          alt=""
          fill
          priority
          className="animate-drift object-cover object-center"
          sizes="100vw"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-r from-[#eef3f4]/95 via-[#e8eef0]/78 to-[#dce7ea]/45"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-[#c8d8dc]/50 via-transparent to-[#f2f6f7]/40"
        />
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute -left-1/4 top-1/4 h-[50vh] w-[50vw] animate-soft-pulse rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.5)_0%,transparent_70%)]"
      />

      <main className="relative z-10 flex flex-1 flex-col justify-center px-6 py-16 sm:px-12 lg:px-20">
        <div className="mx-auto w-full max-w-2xl lg:mx-0">
          <h1 className="animate-rise font-[family-name:var(--font-display)] text-[clamp(4.5rem,18vw,8.5rem)] font-bold leading-[0.85] tracking-[-0.04em] text-ink">
            Wisp
          </h1>

          <p className="animate-rise-delay-1 mt-8 max-w-md text-lg leading-relaxed text-ink/75 sm:text-xl">
            Wisp, a creative platform that connects your ideas across multiple
            mediums.
          </p>

          <div className="animate-rise-delay-2 mt-10 flex flex-wrap items-center gap-3">
            <a
              href="/signup"
              className="inline-flex h-11 items-center justify-center rounded-md bg-accent px-6 text-[0.95rem] font-medium tracking-wide text-white transition-[background-color,transform] duration-200 hover:bg-accent-hover active:scale-[0.98]"
            >
              Sign up
            </a>
            <a
              href="/login"
              className="inline-flex h-11 items-center justify-center rounded-md border border-ink/20 bg-white/50 px-6 text-[0.95rem] font-medium tracking-wide text-ink backdrop-blur-sm transition-[background-color,border-color,transform] duration-200 hover:border-ink/35 hover:bg-white/80 active:scale-[0.98]"
            >
              Log in
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
