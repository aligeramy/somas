"use client";

import { IconDownload } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePWAInstall } from "@/hooks/use-pwa-install";
import { useState } from "react";

export function PWAInstallButton() {
  const { install, isInstalled, canShowInstall, hasNativePrompt } = usePWAInstall();
  const [showInstructions, setShowInstructions] = useState(false);

  // Don't show if already installed or not mounted
  if (isInstalled || !canShowInstall) {
    return null;
  }

  const isIOS = typeof window !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = typeof window !== "undefined" && /Android/.test(navigator.userAgent);

  const handleInstall = async () => {
    if (hasNativePrompt) {
      // Chrome/Edge - use native prompt
      await install();
    } else if (isIOS && navigator.share) {
      // iOS Safari - use Web Share API to trigger native share menu
      try {
        await navigator.share({
          title: "Install Titans App",
          text: "Add Titans to your home screen for quick access",
          url: window.location.href,
        });
      } catch (error) {
        // User cancelled or share failed - show instructions as fallback
        if ((error as Error).name !== "AbortError") {
          setShowInstructions(true);
        }
      }
    } else {
      // Other browsers - show instructions
      setShowInstructions(true);
    }
  };

  return (
    <>
      <Button
        size="sm"
        className="gap-2 rounded-xl [&>span]:!inline [&>span]:!text-sm"
        onClick={handleInstall}
        variant="outline"
        data-show-text-mobile
      >
        <IconDownload className="h-4 w-4" />
        <span>Install</span>
      </Button>

      <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Install Titans App</DialogTitle>
            <DialogDescription>
              {isIOS ? (
                <div className="space-y-4 mt-4">
                  <p>To install Titans on your iPhone or iPad:</p>
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>Tap the Share button <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-muted">↗</span> at the bottom of the screen</li>
                    <li>Scroll down and tap &quot;Add to Home Screen&quot;</li>
                    <li>Tap &quot;Add&quot; in the top right corner</li>
                  </ol>
                </div>
              ) : isAndroid ? (
                <div className="space-y-4 mt-4">
                  <p>To install Titans on your Android device:</p>
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>Tap the menu button (three dots) in your browser</li>
                    <li>Select &quot;Install app&quot; or &quot;Add to Home screen&quot;</li>
                    <li>Follow the on-screen instructions</li>
                  </ol>
                </div>
              ) : (
                <div className="space-y-4 mt-4">
                  <p>To install Titans:</p>
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>Look for the install icon in your browser&apos;s address bar</li>
                    <li>Click it and follow the installation prompts</li>
                    <li>Or use your browser&apos;s menu to find &quot;Install&quot; or &quot;Add to Home Screen&quot;</li>
                  </ol>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
}

