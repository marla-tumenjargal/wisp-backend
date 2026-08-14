import { redirect } from "next/navigation";
import { SiteNav } from "@/components/site-nav";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/discover");
  }

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-paper text-ink">
      {/* Right half — Yves Klein Blue */}
      <div
        aria-hidden
        className="animate-panel-in pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 bg-klein md:block"
      />

      <SiteNav current="/" variant="split" />

      <main className="relative z-10 grid min-h-dvh grid-cols-1 md:grid-cols-2">
        <section className="flex flex-col justify-start px-8 pb-16 pt-28 sm:px-12 sm:pt-32 lg:px-16 lg:pt-36 xl:px-20">
          <h1 className="animate-rise font-[family-name:var(--font-display)] text-[clamp(3.75rem,12vw,7rem)] font-bold leading-[0.9] tracking-[-0.045em] text-ink">
            wisp.
          </h1>
          <p className="animate-rise-delay-1 mt-5 max-w-sm text-[1.05rem] font-medium leading-snug tracking-[-0.01em] text-ink/70 sm:mt-6 sm:text-xl md:max-w-[18rem] lg:max-w-sm">
            an interface that expands how you create.
          </p>
        </section>

        {/* Mobile Klein field */}
        <section
          aria-hidden
          className="animate-panel-in min-h-[46vh] bg-klein md:min-h-0 md:bg-transparent"
        />
      </main>
    </div>
  );
}
