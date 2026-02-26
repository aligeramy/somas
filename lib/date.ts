/**
 * App timezone: all user-facing dates (emails, notifications) are shown in Toronto time.
 */
export const APP_TIMEZONE = "America/Toronto";

/**
 * Format an occurrence date for display in emails and notifications (e.g. "26 Feb").
 * Uses the app timezone so evening events show the correct calendar day.
 */
export function formatOccurrenceDateShort(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    day: "numeric",
    month: "short",
  })
    .format(date)
    .replace(".", ""); // "26 Feb." -> "26 Feb"
}

/**
 * Format a date for full display (e.g. "Thursday, February 26, 2025").
 */
export function formatOccurrenceDateLong(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}
