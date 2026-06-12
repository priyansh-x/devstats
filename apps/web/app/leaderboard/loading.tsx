export default function LeaderboardLoading() {
  return (
    <main className="max-w-5xl mx-auto px-6 py-8 animate-pulse">
      <div className="flex items-center justify-between border-b border-ink pb-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-hazard border border-ink" />
          <div className="h-4 w-20 bg-ink/10" />
        </div>
        <div className="h-8 w-32 bg-ink/10" />
      </div>

      <div className="mb-8">
        <div className="h-12 w-72 bg-ink/15 mb-3" />
        <div className="h-4 w-96 bg-ink/10" />
      </div>

      <div className="flex gap-2 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-8 w-20 border border-ink/20 bg-ink/5" />
        ))}
      </div>

      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border border-ink/10 p-4">
            <div className="w-8 h-8 bg-ink/10" />
            <div className="h-4 w-32 bg-ink/10" />
            <div className="ml-auto h-4 w-20 bg-ink/10" />
          </div>
        ))}
      </div>
    </main>
  );
}
