import Link from "next/link";
import { SpecCard } from "./spec-card";
import { Badge } from "./badge";
import { getLeaderboard } from "@/lib/leaderboard";
import { fmtCompact } from "@/lib/utils";

/**
 * Compact, server-rendered preview of the live leaderboard for the landing
 * page. Falls back to a synthetic preview when no public operators exist.
 */
export async function LeaderboardStrip() {
  const live = await getLeaderboard("weekly", "tokens");
  const empty = live.length === 0;
  const rows = empty
    ? [
        { rank: 1, username: "your-handle-here", score: 84_000_000, tools: ["CLAUDE_CODE"] },
        { rank: 2, username: "alex",             score: 41_200_000, tools: ["CLAUDE_CODE", "CURSOR"] },
        { rank: 3, username: "rin",              score: 22_800_000, tools: ["CURSOR"] },
      ]
    : live.slice(0, 5);

  return (
    <SpecCard
      label="Live leaderboard"
      meta={empty ? "preview — no one's public yet" : "this week · tokens"}
      className="mb-10"
    >
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-ink/60 border-b border-ink/30">
            <th className="py-2 w-10">#</th>
            <th className="py-2">User</th>
            <th className="py-2">Tools</th>
            <th className="py-2 text-right">Tokens</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.username} className={`border-b border-ink/10 ${empty ? "opacity-60" : ""}`}>
              <td className="py-2 font-bold tabular-nums">
                <span className={r.rank <= 3 ? "text-hazard" : ""}>{r.rank}</span>
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
                      {t.replace("_", " ").toLowerCase()}
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
        <span className="text-xs text-ink/60">
          {empty ? "Sample data — toggle public in Settings to be first." : "Top 5 this week."}
        </span>
        <Link
          href="/leaderboard"
          className="text-xs font-bold uppercase tracking-wide border border-ink px-3 py-1 hover:bg-ink hover:text-bone"
        >
          Full leaderboard →
        </Link>
      </div>
    </SpecCard>
  );
}
