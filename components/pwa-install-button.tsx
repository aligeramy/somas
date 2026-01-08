"use client";

import { IconDownload, IconShare } from "@tabler/icons-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePWAInstall } from "@/hooks/use-pwa-install";

export function PWAInstallButton() {
  const { install, isInstalled, canShowInstall, hasNativePrompt } =
    usePWAInstall();
  const [showInstructions, setShowInstructions] = useState(false);

  // Don't show if already installed or not mounted
  if (isInstalled || !canShowInstall) {
    return null;
  }

  const isIOS =
    typeof window !== "undefined" &&
    /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid =
    typeof window !== "undefined" && /Android/.test(navigator.userAgent);

  const handleInstall = async () => {
    if (hasNativePrompt) {
      // Chrome/Edge - use native prompt
      await install();
    } else {
      // iOS/Android/Other - show instructions
      setShowInstructions(true);
    }
  };

  return (
    <>
      <Button
        className="[&>span]:!inline [&>span]:!text-sm gap-2 rounded-sm"
        data-show-text-mobile
        onClick={handleInstall}
        size="sm"
        variant="outline"
      >
        <IconDownload className="h-4 w-4" />
        <span>Install</span>
      </Button>

      <Dialog onOpenChange={setShowInstructions} open={showInstructions}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Install SOMAS</DialogTitle>
          </DialogHeader>

          {isIOS ? (
            <div className="space-y-5 py-2">
              <p className="text-muted-foreground">
                Add to your home screen for quick access:
              </p>

              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary font-medium text-primary-foreground text-sm">
                    1
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium">Tap the Share button</p>
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <IconShare className="h-5 w-5" />
                      <span>at the bottom of Safari</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary font-medium text-primary-foreground text-sm">
                    2
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium">Scroll down and tap</p>
                    <p className="text-muted-foreground text-sm">
                      &quot;Add to Home Screen&quot;
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary font-medium text-primary-foreground text-sm">
                    3
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium">Tap &quot;Add&quot;</p>
                    <p className="text-muted-foreground text-sm">
                      in the top right corner
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : isAndroid ? (
            <div className="space-y-5 py-2">
              <p className="text-muted-foreground">
                Add to your home screen for quick access:
              </p>

              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary font-medium text-primary-foreground text-sm">
                    1
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium">Tap the menu button</p>
                    <p className="text-muted-foreground text-sm">
                      Three dots (⋮) in your browser
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary font-medium text-primary-foreground text-sm">
                    2
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium">
                      Select &quot;Install app&quot;
                    </p>
                    <p className="text-muted-foreground text-sm">
                      or &quot;Add to Home screen&quot;
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary font-medium text-primary-foreground text-sm">
                    3
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium">Follow the prompts</p>
                    <p className="text-muted-foreground text-sm">
                      to complete installation
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-5 py-2">
              <p className="text-muted-foreground">
                Add to your device for quick access:
              </p>

              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary font-medium text-primary-foreground text-sm">
                    1
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium">Look for the install icon</p>
                    <p className="text-muted-foreground text-sm">
                      in your browser&apos;s address bar
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary font-medium text-primary-foreground text-sm">
                    2
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium">Click it and follow prompts</p>
                    <p className="text-muted-foreground text-sm">
                      or use browser menu → &quot;Install&quot;
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <Button
            className="mt-2 w-full"
            onClick={() => setShowInstructions(false)}
            variant="outline"
          >
            Got it
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
