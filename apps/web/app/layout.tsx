import type { Metadata } from "next";
import { Suspense } from "react";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { NavProgress } from "@/components/nav-progress";
import "./globals.css";

export const metadata: Metadata = {
  title: "DevStats",
  description:
    "Track tokens, sessions, streaks across Claude Code, Cursor, Copilot. Private by default.",
  metadataBase: new URL("https://devstats.me"),
  openGraph: {
    siteName: "DevStats",
    type: "website",
  },
};

const themeScript = `(function(){try{var t=localStorage.getItem('devstats-theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme:dark)').matches;if(d)document.documentElement.classList.add('dark')}catch(e){}})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Suspense fallback={null}>
          <NavProgress />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
