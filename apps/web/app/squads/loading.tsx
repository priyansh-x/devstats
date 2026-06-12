export default function SquadsLoading() {
  return (
    <main className="max-w-5xl mx-auto px-6 py-8 animate-pulse">
      <div className="flex items-center justify-between border-b border-ink pb-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-hazard border border-ink" />
          <div className="h-4 w-20 bg-ink/10" />
        </div>
        <div className="h-8 w-32 bg-ink/10" />
      </div>

      <div className="h-12 w-56 bg-ink/15 mb-3" />
      <div className="h-4 w-80 bg-ink/10 mb-8" />

      <div className="grid md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="border border-ink p-5 space-y-3">
            <div className="h-5 w-40 bg-ink/10" />
            <div className="h-3 w-24 bg-ink/5" />
            <div className="h-8 w-full bg-ink/5" />
          </div>
        ))}
      </div>
    </main>
  );
}
