"use client";

import { useEffect } from "react";

export function LightModeWrapper({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Force light mode immediately
    const html = document.documentElement;
    html.classList.remove("dark");

    // Prevent theme provider from adding dark mode
    const observer = new MutationObserver(() => {
      if (html.classList.contains("dark")) {
        html.classList.remove("dark");
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

