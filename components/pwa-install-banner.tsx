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
    <div className="fixed bottom-20 left-4 right-4 z-50 md:bottom-6 md:left-auto md:right-6 md:max-w-sm animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-lg">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <IconDownload className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">Install Titans App</p>
          <p className="text-xs text-muted-foreground truncate">
            Quick access from your home screen
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            className="rounded-xl h-8 px-3 text-xs"
            onClick={handleInstall}
          >
            Install
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={handleDismiss}
          >
            <IconX className="h-4 w-4" />
            <span className="sr-only">Dismiss</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
