'use client';

export function WorkspaceSkeleton({ label = "Loading your workspace…" }: { label?: string }) {
  return (
    <div className="flex h-[100dvh] w-screen flex-col bg-ink text-content">
      <div className="flex h-12 shrink-0 items-center gap-3 border-b border-line/60 px-4">
        <span className="h-2.5 w-2.5 rounded-full bg-brass/70" />
        <span className="h-2.5 w-24 rounded-full bg-zinc-800" />
        <span className="ml-auto h-6 w-20 rounded-full bg-zinc-800" />
        <span className="h-6 w-16 rounded-full bg-zinc-800" />
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="hidden w-16 shrink-0 flex-col items-center gap-3 border-r border-line/60 py-4 sm:flex">
          {Array.from({ length: 7 }).map((_, i) => (
            <span
              key={i}
              className="h-9 w-9 animate-pulse rounded-lg bg-zinc-800"
              style={{ animationDelay: `${i * 90}ms` }}
            />
          ))}
        </div>

        <div className="relative flex flex-1 items-center justify-center">
          <div aria-hidden="true" className="line-grid absolute inset-0 opacity-30" />
          <p className="relative text-[13px] tracking-wide text-content-tertiary">{label}</p>
        </div>

        <div className="hidden w-72 shrink-0 flex-col gap-4 border-l border-line/60 p-4 lg:flex">
          <span className="h-4 w-28 animate-pulse rounded bg-zinc-800" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <span className="block h-3 w-full animate-pulse rounded bg-zinc-800" style={{ animationDelay: `${i * 120}ms` }} />
              <span className="block h-3 w-4/5 animate-pulse rounded bg-zinc-800" style={{ animationDelay: `${i * 120 + 60}ms` }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
