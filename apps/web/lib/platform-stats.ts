import { cache } from "react";
import { prisma } from "./prisma";

/**
 * Real platform-wide totals used by the landing page. Wrapped in React's
 * cache so dedupes across server-component renders of the same request, and
 * the page itself is `revalidate = 300` so it doesn't hammer the DB on
 * every visit. Returns honest zeros when the DB is empty.
 */
export const getPlatformStats = cache(async () => {
  const [users, sessions, agg] = await Promise.all([
    prisma.user.count(),
    prisma.session.count(),
    prisma.session.aggregate({ _sum: { tokensIn: true, tokensOut: true } }),
  ]);
  return {
    users,
    sessions,
    tokens: (agg._sum.tokensIn ?? 0) + (agg._sum.tokensOut ?? 0),
  };
});
