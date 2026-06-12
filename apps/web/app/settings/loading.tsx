export default function SettingsLoading() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-8 animate-pulse">
      <div className="flex items-center justify-between border-b border-ink pb-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-hazard border border-ink" />
          <div className="h-4 w-20 bg-ink/10" />
        </div>
        <div className="h-8 w-32 bg-ink/10" />
      </div>

      <div className="h-10 w-48 bg-ink/15 mb-8" />

      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="border border-ink">
            <div className="bg-ink h-9" />
            <div className="p-5 space-y-3">
              <div className="h-4 w-64 bg-ink/10" />
              <div className="h-10 w-full bg-ink/5 border border-ink/10" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
