"use client";

import { IconX, IconDownload, IconDeviceMobile } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
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
  const { install, isInstalled, canShowInstall, hasNativePrompt } = usePWAInstall();
  const [showPrompt, setShowPrompt] = useState(false);
  
  const isIOS = typeof window !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = typeof window !== "undefined" && /Android/.test(navigator.userAgent);

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
    const dismissed = localStorage.getItem("pwa-install-dismissed-v2");
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
    localStorage.setItem("pwa-install-dismissed-v2", "true");
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("pwa-install-dismissed-v2", "true");
  };

  // Don't show if already installed or prompt not triggered
  if (isInstalled || !showPrompt) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Fullscreen backdrop with blur */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-md transition-opacity"
        onClick={handleDismiss}
        aria-hidden="true"
      />
      
      {/* Centered modal card */}
      <Card className="relative z-10 w-full max-w-md rounded-2xl border shadow-2xl animate-in fade-in-0 zoom-in-95 duration-200">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <IconDeviceMobile className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">
            Install Titans App
          </CardTitle>
          <CardDescription className="mt-2 text-base">
            Get quick access and a better experience by installing Titans on your device
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 text-sm text-muted-foreground">
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
                  onClick={handleInstall}
                  className="w-full rounded-xl h-11 text-base font-semibold"
                  size="lg"
                >
                  <IconDownload className="h-5 w-5 mr-2" />
                  Install Now
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleDismiss}
                  className="w-full rounded-xl"
                >
                  Maybe Later
                </Button>
              </>
            ) : (
              <>
                <div className="text-sm text-muted-foreground space-y-2 mb-2">
                  {isIOS ? (
                    <div>
                      <p className="font-medium text-foreground mb-2">To install on iPhone/iPad:</p>
                      <ol className="list-decimal list-inside space-y-1 text-xs">
                        <li>Tap the Share button at the bottom</li>
                        <li>Scroll and tap &quot;Add to Home Screen&quot;</li>
                        <li>Tap &quot;Add&quot;</li>
                      </ol>
                    </div>
                  ) : isAndroid ? (
                    <div>
                      <p className="font-medium text-foreground mb-2">To install on Android:</p>
                      <ol className="list-decimal list-inside space-y-1 text-xs">
                        <li>Tap the menu (three dots)</li>
                        <li>Select &quot;Install app&quot;</li>
                        <li>Follow the prompts</li>
                      </ol>
                    </div>
                  ) : (
                    <div>
                      <p className="font-medium text-foreground mb-2">To install:</p>
                      <p className="text-xs">Look for the install icon in your browser&apos;s address bar or menu.</p>
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  onClick={handleDismiss}
                  className="w-full rounded-xl"
                >
                  Got it
                </Button>
              </>
            )}
          </div>
        </CardContent>
        
        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 h-8 w-8 rounded-lg"
          onClick={handleDismiss}
        >
          <IconX className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </Button>
      </Card>
    </div>
  );
}

