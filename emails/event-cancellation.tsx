import { Heading, Section, Text } from "@react-email/components";
import { BaseLayout } from "./base-layout";

interface EventCancellationEmailProps {
  gymName: string;
  gymLogoUrl?: string | null;
  athleteName: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventLocation?: string;
  fullDate?: string;
  dashboardUrl: string;
}

export function EventCancellationEmail({
  gymName,
  gymLogoUrl,
  athleteName,
  eventTitle,
  eventDate,
  eventTime,
  eventLocation,
  fullDate,
  dashboardUrl,
}: EventCancellationEmailProps) {
  const displayDate = fullDate || eventDate;

  return (
    <BaseLayout
      gymLogoUrl={gymLogoUrl}
      gymName={gymName}
      preview={`${eventTitle} has been canceled`}
    >
      <Text className="mb-4 text-base text-zinc-900">
        Hi {athleteName.split(" ")[0] || "there"},
      </Text>

      <Text className="mb-6 text-[15px] text-gray-600 leading-6">
        The following session has been canceled:
      </Text>

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
          className="mt-4 mb-0 font-bold text-red-600 text-sm uppercase tracking-widest"
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

      <Text className="mb-6 text-[15px] text-gray-600 leading-6">
        We apologize for any inconvenience. Please check the app for updates on
        future events.
      </Text>

      <Text className="m-0 text-center text-[13px] text-gray-400">
        View your events in the{" "}
        <a
          className="text-zinc-900 underline"
          href={dashboardUrl}
          style={{ color: "#18181b", textDecoration: "underline" }}
        >
          dashboard
        </a>
        .
      </Text>
    </BaseLayout>
  );
}

export default EventCancellationEmail;
