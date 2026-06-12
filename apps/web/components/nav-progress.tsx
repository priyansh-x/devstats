"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function NavProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    setProgress(100);
    const t = setTimeout(() => setVisible(false), 200);
    return () => clearTimeout(t);
  }, [pathname, searchParams]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("http") || href.startsWith("#")) return;
      if (href === pathname) return;

      setProgress(0);
      setVisible(true);
      requestAnimationFrame(() => {
        setProgress(30);
        clearInterval(timer.current);
        timer.current = setInterval(() => {
          setProgress((p) => Math.min(p + Math.random() * 10, 90));
        }, 300);
      });
    };

    document.addEventListener("click", handleClick, true);
    return () => {
      document.removeEventListener("click", handleClick, true);
      clearInterval(timer.current);
    };
  }, [pathname]);

  if (!visible && progress === 0) return null;

  return (
    <div
      className="fixed top-0 left-0 h-[3px] bg-hazard z-[9999] transition-all ease-out"
      style={{
        width: `${progress}%`,
        transitionDuration: progress === 100 ? "200ms" : "500ms",
        opacity: visible ? 1 : 0,
      }}
    />
  );
}
