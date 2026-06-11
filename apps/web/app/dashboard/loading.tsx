/**
 * Route-level loading skeleton — paints instantly while the server component
 * fetches stats from Postgres. Mirrors the dashboard's real layout so the
 * eventual content swap doesn't jump.
 */
export default function DashboardLoading() {
  return (
    <main className="max-w-6xl mx-auto px-6 py-8 animate-pulse">
      {/* header strip */}
      <div className="flex items-center justify-between border-b border-ink pb-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-hazard border border-ink" />
          <div className="h-4 w-20 bg-ink/10" />
        </div>
        <div className="h-8 w-40 bg-ink/10" />
      </div>

      <div className="mb-8">
        <div className="h-3 w-32 bg-ink/10 mb-2" />
        <div className="h-10 w-64 bg-ink/15" />
      </div>

      {/* overview card */}
      <div className="border border-ink mb-6">
        <div className="bg-ink h-9" />
        <div className="p-5 grid grid-cols-2 md:grid-cols-6 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i}>
              <div className="h-3 w-16 bg-ink/10 mb-2" />
              <div className="h-8 w-20 bg-ink/15" />
            </div>
          ))}
        </div>
      </div>

      {/* heatmap card */}
      <div className="border border-ink mb-6">
        <div className="bg-ink h-9" />
        <div className="p-5">
          <div className="h-28 w-full bg-ink/10" />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="border border-ink">
            <div className="bg-ink h-9" />
            <div className="p-5">
              <div className="h-40 w-full bg-ink/10" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
