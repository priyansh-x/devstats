import { BoxLoader } from "@/components/box-loader";

export default function SettingsLoading() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between border-b border-ink pb-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-hazard border border-ink" />
          <div className="h-4 w-20 bg-ink/10 animate-pulse" />
        </div>
        <div className="h-8 w-32 bg-ink/10 animate-pulse" />
      </div>

      <div className="border border-ink">
        <div className="bg-ink h-9" />
        <div className="min-h-[50vh] flex items-center justify-center">
          <BoxLoader label="LOADING SETUP" />
        </div>
      </div>
    </main>
  );
}
