"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    
    // Check if app is already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // Listen for the beforeinstallprompt event (Chrome/Edge)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Check if app was installed
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (deferredPrompt) {
      try {
        // Show the install prompt (Chrome/Edge)
        await deferredPrompt.prompt();

        // Wait for the user to respond
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === "accepted") {
          setIsInstalled(true);
          setIsInstallable(false);
          setDeferredPrompt(null);
          return true;
        }

        // Clear the deferred prompt
        setDeferredPrompt(null);
        return false;
      } catch (error) {
        console.error("Error installing PWA:", error);
        return false;
      }
    }
    
    // For iOS Safari or other browsers without beforeinstallprompt
    // Return false so the UI can show instructions
    return false;
  };

  // Show install option if not installed and mounted (client-side)
  const canShowInstall = isMounted && !isInstalled;

  return {
    install,
    isInstalled,
    isInstallable: isInstallable && !isInstalled,
    canShowInstall,
    hasNativePrompt: !!deferredPrompt,
  };
}

