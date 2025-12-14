"use client";

import { useEffect } from "react";

export function DarkModeWrapper({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Force dark mode immediately
    const html = document.documentElement;
    html.classList.add("dark");

    // Prevent theme provider from removing dark mode
    const observer = new MutationObserver(() => {
      if (!html.classList.contains("dark")) {
        html.classList.add("dark");
      }
    });

    observer.observe(html, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  return <>{children}</>;
}
