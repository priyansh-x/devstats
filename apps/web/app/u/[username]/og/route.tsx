import { ImageResponse } from "next/og";
import { getPublicProfile } from "@/lib/public-stats";
import { fmtCompact, fmtDuration } from "@/lib/utils";
import { ratelimit, ipFrom } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HAZARD = "#FF5A1F";
const INK = "#0A0A0A";
const BONE = "#F5F1EA";

export async function GET(
  req: Request,
  { params }: { params: { username: string } },
) {
  const gate = await ratelimit("og", ipFrom(req));
  if (!gate.ok) {
    return new Response("rate limited", {
      status: 429,
      headers: { "Retry-After": String(gate.retryAfterSeconds) },
    });
  }
  const profile = await getPublicProfile(params.username);
  if (!profile) {
    return new ImageResponse(
      (
        <div style={fullPage()}>
          <div style={{ ...sectionBar(), fontSize: 28 }}>OPERATOR NOT FOUND</div>
        </div>
      ),
      { width: 1200, height: 630 },
    );
  }

  const { stats } = profile;
  const totalTok = fmtCompact(stats.totals.tokensIn + stats.totals.tokensOut);

  return new ImageResponse(
    (
      <div style={fullPage()}>
        {/* Left: orange spec sheet */}
        <div style={{
          flex: 1,
          background: HAZARD,
          padding: 56,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          borderRight: `2px solid ${INK}`,
        }}>
          <div style={{ fontSize: 18, letterSpacing: 2, fontWeight: 700 }}>
            DSU-01 / OPERATOR SPEC SHEET
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 22, letterSpacing: 2 }}>OPERATOR</div>
            <div style={{ fontSize: 96, fontWeight: 900, lineHeight: 0.95, marginTop: 8, letterSpacing: -2 }}>
              {profile.username.toUpperCase()}
            </div>
            <div style={{ fontSize: 20, marginTop: 16, letterSpacing: 1 }}>
              SINCE {profile.createdAt.slice(0, 10)}
            </div>
          </div>
          <div style={{ fontSize: 16, letterSpacing: 2 }}>
            DEVSTATS.APP/U/{profile.username.toUpperCase()}
          </div>
        </div>

        {/* Right: specs block */}
        <div style={{ width: 500, background: BONE, display: "flex", flexDirection: "column" }}>
          <div style={sectionBar()}>SPECS</div>
          <div style={{ padding: 36, display: "flex", flexDirection: "column", gap: 24 }}>
            {[
              ["TOKENS",   totalTok],
              ["SESSIONS", String(stats.totals.sessions)],
              ["DURATION", fmtDuration(stats.totals.durationMs)],
              ["STREAK",   `${stats.streak.current}D`],
              ["ACTIVE",   `${stats.totals.activeDays}D`],
            ].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: 18, letterSpacing: 2, color: "#3A3A3A" }}>{k}</span>
                <span style={{ fontSize: 44, fontWeight: 900, color: INK }}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: "auto", padding: "16px 36px", borderTop: `1px solid ${INK}33`, fontSize: 14, letterSpacing: 2, color: "#3A3A3A" }}>
            FIELD OPS READY · MADE FOR DEVS
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}

function fullPage(): React.CSSProperties {
  return {
    width: "100%",
    height: "100%",
    display: "flex",
    background: BONE,
    color: INK,
    fontFamily: "monospace",
  };
}

function sectionBar(): React.CSSProperties {
  return {
    background: INK,
    color: HAZARD,
    padding: "14px 28px",
    fontSize: 18,
    letterSpacing: 3,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
  };
}
