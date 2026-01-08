"use client";

import { IconDeviceMobile, IconDownload, IconX } from "@tabler/icons-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { usePWAInstall } from "@/hooks/use-pwa-install";

export function PWAInstallPrompt() {
  const pathname = usePathname();
  const { install, isInstalled, canShowInstall, hasNativePrompt } =
    usePWAInstall();
  const [showPrompt, setShowPrompt] = useState(false);

  const isIOS =
    typeof window !== "undefined" &&
    /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid =
    typeof window !== "undefined" && /Android/.test(navigator.userAgent);

  // Only show on dashboard page
  const isDashboard = pathname === "/dashboard";

  useEffect(() => {
    // Don't show if not on dashboard
    if (!isDashboard) {
      setShowPrompt(false);
      return;
    }

    if (isInstalled || !canShowInstall) {
      setShowPrompt(false);
      return;
    }

    // Check if user has dismissed the prompt before (new storage key)
    const dismissed = localStorage.getItem("pwa-install-dismissed-v3");
    if (dismissed === "true") {
      return;
    }

    // Show the prompt for everyone (with native support or instructions)
    // Small delay to ensure smooth animation
    const timer = setTimeout(() => {
      setShowPrompt(true);
    }, 1000); // 1 second delay to let page load

    return () => clearTimeout(timer);
  }, [isInstalled, canShowInstall, isDashboard]);

  const handleInstall = async () => {
    if (hasNativePrompt) {
      const success = await install();
      if (success) {
        setShowPrompt(false);
      }
    } else {
      // For browsers without native prompt, just dismiss and show instructions
      // User can use the header button for instructions
      setShowPrompt(false);
    }
    localStorage.setItem("pwa-install-dismissed-v3", "true");
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("pwa-install-dismissed-v3", "true");
  };

  // Don't show if already installed or prompt not triggered
  if (isInstalled || !showPrompt) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Fullscreen backdrop with blur */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-background/80 backdrop-blur-md transition-opacity"
        onClick={handleDismiss}
      />

      {/* Centered modal card */}
      <Card className="fade-in-0 zoom-in-95 relative z-10 w-full max-w-md animate-in rounded-2xl border shadow-2xl duration-200">
        <CardHeader className="pb-4 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <IconDeviceMobile className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="font-bold text-2xl">
            Install SOMAS App
          </CardTitle>
          <CardDescription className="mt-2 text-base">
            Get quick access and a better experience by installing SOMAS on your
            device
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 text-muted-foreground text-sm">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary" />
              <span>Faster access from your home screen</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary" />
              <span>Works offline</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary" />
              <span>Better performance</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            {hasNativePrompt ? (
              <>
                <Button
                  className="h-11 w-full rounded-xl font-semibold text-base"
                  onClick={handleInstall}
                  size="lg"
                >
                  <IconDownload className="mr-2 h-5 w-5" />
                  Install Now
                </Button>
                <Button
                  className="w-full rounded-xl"
                  onClick={handleDismiss}
                  variant="ghost"
                >
                  Maybe Later
                </Button>
              </>
            ) : (
              <>
                <div className="mb-2 space-y-2 text-muted-foreground text-sm">
                  {isIOS ? (
                    <div>
                      <p className="mb-2 font-medium text-foreground">
                        To install on iPhone/iPad:
                      </p>
                      <ol className="list-inside list-decimal space-y-1 text-xs">
                        <li>Tap the Share button at the bottom</li>
                        <li>Scroll and tap &quot;Add to Home Screen&quot;</li>
                        <li>Tap &quot;Add&quot;</li>
                      </ol>
                    </div>
                  ) : isAndroid ? (
                    <div>
                      <p className="mb-2 font-medium text-foreground">
                        To install on Android:
                      </p>
                      <ol className="list-inside list-decimal space-y-1 text-xs">
                        <li>Tap the menu (three dots)</li>
                        <li>Select &quot;Install app&quot;</li>
                        <li>Follow the prompts</li>
                      </ol>
                    </div>
                  ) : (
                    <div>
                      <p className="mb-2 font-medium text-foreground">
                        To install:
                      </p>
                      <p className="text-xs">
                        Look for the install icon in your browser&apos;s address
                        bar or menu.
                      </p>
                    </div>
                  )}
                </div>
                <Button
                  className="w-full rounded-xl"
                  onClick={handleDismiss}
                  variant="ghost"
                >
                  Got it
                </Button>
              </>
            )}
          </div>
        </CardContent>

        {/* Close button */}
        <Button
          className="absolute top-4 right-4 h-8 w-8 rounded-lg"
          onClick={handleDismiss}
          size="icon"
          variant="ghost"
        >
          <IconX className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </Button>
      </Card>
    </div>
  );
}
