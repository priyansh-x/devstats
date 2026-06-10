import Link from "next/link";
import { SpecCard } from "./spec-card";
import { Badge } from "./badge";
import { getLeaderboard } from "@/lib/leaderboard";
import { fmtCompact } from "@/lib/utils";

/**
 * Compact, server-rendered preview of the live leaderboard for the landing
 * page. Falls back to a synthetic "what this will look like" block when no
 * public operators exist yet.
 */
export async function LeaderboardStrip() {
  const live = await getLeaderboard("weekly", "tokens");
  const empty = live.length === 0;
  const rows = empty
    ? [
        { rank: 1, username: "your-handle-here", score: 84_000_000, tools: ["CLAUDE_CODE"] },
        { rank: 2, username: "operator-002",     score: 41_200_000, tools: ["CLAUDE_CODE", "CURSOR"] },
        { rank: 3, username: "operator-003",     score: 22_800_000, tools: ["CURSOR"] },
      ]
    : live.slice(0, 5);

  return (
    <SpecCard
      label="LIVE LEADERBOARD"
      meta={empty ? "PREVIEW · NO PUBLIC OPS YET" : "WEEKLY · TOKENS"}
      className="mb-10"
    >
      <table className="w-full font-mono text-sm">
        <thead>
          <tr className="text-left spec-label text-ink/60 border-b border-ink/30">
            <th className="py-2 w-12">RANK</th>
            <th className="py-2">OPERATOR</th>
            <th className="py-2">TOOLS</th>
            <th className="py-2 text-right">TOKENS</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.username} className={`border-b border-ink/10 ${empty ? "opacity-60" : ""}`}>
              <td className="py-2 spec-label font-bold">
                <span className={r.rank <= 3 ? "text-hazard" : ""}>
                  #{String(r.rank).padStart(3, "0")}
                </span>
              </td>
              <td className="py-2">
                {empty ? (
                  <span className="italic">{r.username}</span>
                ) : (
                  <Link href={`/u/${r.username}`} className="font-bold hover:text-hazard">
                    {r.username}
                  </Link>
                )}
              </td>
              <td className="py-2">
                <div className="flex gap-1 flex-wrap">
                  {r.tools.slice(0, 3).map((t) => (
                    <Badge key={t} variant="outline" className="text-[10px]">
                      {t.replace("_", " ")}
                    </Badge>
                  ))}
                </div>
              </td>
              <td className="py-2 text-right tabular-nums font-bold">{fmtCompact(r.score)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 flex items-center justify-between">
        <span className="spec-label text-ink/60">
          {empty ? "EXAMPLE DATA — TOGGLE PUBLIC IN SETTINGS TO BE FIRST." : "TOP 5 OF THIS WEEK."}
        </span>
        <Link
          href="/leaderboard"
          className="spec-label border border-ink px-3 py-1 hover:bg-ink hover:text-hazard"
        >
          FULL TABLE →
        </Link>
      </div>
    </SpecCard>
  );
}
