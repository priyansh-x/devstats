import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // Public profiles are, by definition, public — including them helps
  // shared profile links rank for the user's own handle.
  const publicUsers = await prisma.user
    .findMany({
      where: { isPublic: true },
      select: { username: true, updatedAt: true },
      take: 1000,
      orderBy: { updatedAt: "desc" },
    })
    .catch(() => []);

  return [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/leaderboard`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${base}/privacy`, changeFrequency: "monthly", priority: 0.3 },
    ...publicUsers.map((u) => ({
      url: `${base}/u/${u.username}`,
      lastModified: u.updatedAt,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
  ];
}
