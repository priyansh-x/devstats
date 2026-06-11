import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Private surfaces and the API have no business being indexed.
        disallow: ["/api/", "/dashboard", "/settings", "/auth/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
