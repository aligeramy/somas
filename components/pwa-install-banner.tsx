"use client";

import { IconDownload, IconX } from "@tabler/icons-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { usePWAInstall } from "@/hooks/use-pwa-install";

export function PWAInstallBanner() {
  const pathname = usePathname();
  const { install, isInstalled, hasNativePrompt } = usePWAInstall();
  const [showBanner, setShowBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Only show on dashboard page
  const isDashboard = pathname === "/dashboard";

  useEffect(() => {
    // Don't show if not on dashboard
    if (!isDashboard) {
      setShowBanner(false);
      return;
    }

    // Don't show if already installed or dismissed
    if (isInstalled || dismissed) {
      setShowBanner(false);
      return;
    }

    // Check if user has dismissed before
    const wasDismissed = localStorage.getItem("pwa-banner-dismissed-v1");
    if (wasDismissed === "true") {
      setDismissed(true);
      return;
    }

    // Only show if browser supports native prompt (Chrome/Edge)
    if (hasNativePrompt) {
      // Small delay to let page load
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isInstalled, hasNativePrompt, isDashboard, dismissed]);

  const handleInstall = async () => {
    const success = await install();
    if (success) {
      setShowBanner(false);
    }
    // Don't persist dismissal on install attempt - let them try again if they decline
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setDismissed(true);
    localStorage.setItem("pwa-banner-dismissed-v1", "true");
  };

  if (!showBanner) {
    return null;
  }

  return (
    <div className="slide-in-from-bottom-4 fade-in fixed right-4 bottom-20 left-4 z-50 animate-in duration-300 md:right-6 md:bottom-6 md:left-auto md:max-w-sm">
      <div className="flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-lg">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <IconDownload className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm">Install SOMAS App</p>
          <p className="truncate text-muted-foreground text-xs">
            Quick access from your home screen
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            className="h-8 rounded-xl px-3 text-xs"
            onClick={handleInstall}
            size="sm"
          >
            Install
          </Button>
          <Button
            className="h-8 w-8 shrink-0"
            onClick={handleDismiss}
            size="icon"
            variant="ghost"
          >
            <IconX className="h-4 w-4" />
            <span className="sr-only">Dismiss</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
