import { Button, Heading, Section, Text } from "@react-email/components";
import { BaseLayout } from "./base-layout";

interface EventReminderEmailProps {
  gymName: string;
  gymLogoUrl?: string | null;
  athleteName: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventLocation?: string;
  fullDate?: string; // e.g. "Sunday, February 1, 2026"
  reminderType: string; // "7_day", "1_day", "30_min"
  rsvpUrl: string;
}

export function EventReminderEmail({
  gymName,
  gymLogoUrl,
  athleteName,
  eventTitle,
  eventDate,
  eventTime,
  eventLocation,
  fullDate,
  reminderType,
  rsvpUrl,
}: EventReminderEmailProps) {
  const reminderText = getReminderText(reminderType);
  const isCanceled = reminderType === "canceled";
  const displayDate = fullDate || eventDate;

  return (
    <BaseLayout
      gymLogoUrl={gymLogoUrl}
      gymName={gymName}
      preview={`${eventTitle} - ${reminderText}`}
    >
      {!isCanceled && (
        <Heading className="mb-6 text-center font-bold text-2xl text-zinc-900">
          {reminderText}
        </Heading>
      )}

      <Text className="mb-4 text-base text-zinc-900">
        Hey {athleteName.split(" ")[0] || "there"},
      </Text>

      <Text className="mb-6 text-[15px] text-gray-600 leading-6">
        {isCanceled
          ? "The following session has been canceled:"
          : "Just a friendly reminder about your upcoming session."}
      </Text>

      {isCanceled ? (
        <>
          {/* Big canceled date hero */}
          <Section className="mb-6 rounded-2xl bg-gray-50 py-8 text-center">
            <div style={{ position: "relative", display: "inline-block" }}>
              <Heading
                className="m-0 font-black text-5xl text-zinc-900 tracking-tight"
                style={{ lineHeight: "1.1", letterSpacing: "-0.02em" }}
              >
                {displayDate}
              </Heading>
              {/* Strikethrough line */}
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "-8px",
                  right: "-8px",
                  height: "4px",
                  backgroundColor: "#dc2626",
                  borderRadius: "2px",
                  transform: "translateY(-50%) rotate(-2deg)",
                }}
              />
            </div>
            <Text
              className="mt-4 mb-0 font-bold text-red-600 text-sm uppercase"
              style={{ letterSpacing: "0.12em" }}
            >
              CANCELED
            </Text>
          </Section>

          {/* Event details */}
          <Section className="mb-6 rounded-xl border border-gray-100 bg-white p-4">
            <Text className="mt-0 mb-1 font-semibold text-base text-zinc-900">
              {eventTitle}
            </Text>
            <Text className="m-0 text-gray-500 text-sm">{eventTime}</Text>
            {eventLocation && (
              <Text className="m-0 text-gray-500 text-sm">{eventLocation}</Text>
            )}
          </Section>

          <Text className="mb-0 text-[15px] text-gray-600 leading-6">
            We apologize for any inconvenience. Please check the app for updates
            on future sessions.
          </Text>
        </>
      ) : (
        <>
          {/* Regular reminder event card */}
          <Section className="mb-6 flex items-center gap-4 rounded-xl bg-gray-50 p-4">
            <div className="min-w-[60px] rounded-lg bg-zinc-900 px-4 py-3 text-center">
              <Text className="m-0 font-bold text-2xl text-white leading-none">
                {eventDate.split(" ")[0]}
              </Text>
              <Text className="mt-1 mb-0 font-medium text-xs text-zinc-400 uppercase">
                {eventDate.split(" ")[1]}
              </Text>
            </div>
            <div className="flex-1">
              <Text className="mt-0 mb-1 font-semibold text-base text-zinc-900">
                {eventTitle}
              </Text>
              {fullDate ? (
                <>
                  <Text className="m-0 text-gray-500 text-sm">{fullDate}</Text>
                  <Text className="m-0 text-gray-500 text-sm">{eventTime}</Text>
                </>
              ) : (
                <Text className="m-0 text-gray-500 text-sm">{eventTime}</Text>
              )}
              {eventLocation && (
                <Text className="m-0 text-gray-500 text-sm">
                  {eventLocation}
                </Text>
              )}
            </div>
          </Section>

          <Text className="mb-6 text-[15px] text-gray-600 leading-6">
            Let us know if you're coming!
          </Text>

          <Section className="mb-6 text-center">
            <Button
              className="rounded-lg bg-zinc-900 px-7 py-3.5 text-center font-semibold text-[15px] text-white no-underline"
              href={rsvpUrl}
            >
              Confirm Attendance
            </Button>
          </Section>

          <Text className="m-0 text-center text-[13px] text-gray-400">
            Can't make it? Update your RSVP to let the coach know.
          </Text>
        </>
      )}
    </BaseLayout>
  );
}

function getReminderText(type: string): string {
  switch (type) {
    case "7_day":
      return "1 Week Away!";
    case "3_day":
      return "3 Days to Go!";
    case "1_day":
      return "Tomorrow!";
    case "30_min":
      return "Starting Soon!";
    case "canceled":
      return "Session Canceled";
    default:
      return "Reminder";
  }
}

export default EventReminderEmail;
