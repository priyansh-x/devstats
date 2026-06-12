import { BoxLoader } from "@/components/box-loader";

/**
 * Route-level loading skeleton — paints instantly while the server component
 * fetches stats from Postgres. Header mirrors the real layout; the body is
 * the brand box loader instead of dead grey blocks.
 */
export default function DashboardLoading() {
  return (
    <main className="max-w-6xl mx-auto px-6 py-8">
      {/* header strip */}
      <div className="flex items-center justify-between border-b border-ink pb-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-hazard border border-ink" />
          <div className="h-4 w-20 bg-ink/10 animate-pulse" />
        </div>
        <div className="h-8 w-40 bg-ink/10 animate-pulse" />
      </div>

      <div className="border border-ink">
        <div className="bg-ink h-9" />
        <div className="min-h-[60vh] flex items-center justify-center">
          <BoxLoader label="COOKING YOUR STATS RN" />
        </div>
      </div>
    </main>
  );
}
