export default function DiscoverLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-3 w-24 bg-ink/10" />
      <div className="mt-4 h-12 w-80 max-w-full bg-ink/10" />
      <p className="mt-6 text-lg text-ink/45">
        Wisp is gathering references for you...
      </p>
      <div className="mt-12 grid grid-cols-1 gap-7 md:grid-cols-2 2xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-lg border border-ink/8"
          >
            <div className="aspect-[5/4] bg-ink/8" />
            <div className="space-y-3 p-6">
              <div className="h-3 w-28 bg-ink/8" />
              <div className="h-6 w-4/5 bg-ink/10" />
              <div className="h-4 w-full bg-ink/8" />
              <div className="h-4 w-2/3 bg-ink/8" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
