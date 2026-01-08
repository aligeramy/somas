import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Get the app URL with validation to prevent localhost in production
 */
export function getAppUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL;

  if (!url) {
    throw new Error("NEXT_PUBLIC_APP_URL environment variable is not set");
  }

  // In production, prevent localhost URLs
  if (
    process.env.NODE_ENV === "production" &&
    (url.includes("localhost") || url.includes("127.0.0.1"))
  ) {
    throw new Error("NEXT_PUBLIC_APP_URL cannot be localhost in production");
  }

  return url;
}
