"use client";

import { useEffect } from "react";

/**
 * Handles HMR (Hot Module Replacement) errors that are harmless
 * but can clutter the console. Specifically handles the "unrecognized HMR message ping" error.
 */
export function HmrErrorHandler() {
  useEffect(() => {
    // Handle unhandled promise rejections (HMR ping errors)
    const handleRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason;

      // Suppress HMR ping errors - these are harmless
      if (
        error instanceof Error &&
        error.message?.includes("unrecognized HMR message") &&
        error.message?.includes("ping")
      ) {
        event.preventDefault();
        // Optionally log in development if needed
        if (process.env.NODE_ENV === "development") {
          // Silently ignore - these are expected HMR ping messages
        }
        return;
      }

      // Let other errors through normally
    };

    // Handle general errors
    const handleError = (event: ErrorEvent) => {
      const error = event.error;

      // Suppress HMR ping errors
      if (
        error instanceof Error &&
        error.message?.includes("unrecognized HMR message") &&
        error.message?.includes("ping")
      ) {
        event.preventDefault();
        return;
      }
    };

    window.addEventListener("unhandledrejection", handleRejection);
    window.addEventListener("error", handleError);

    return () => {
      window.removeEventListener("unhandledrejection", handleRejection);
      window.removeEventListener("error", handleError);
    };
  }, []);

  return null;
}
