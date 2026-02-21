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
  dashboardUrl,
}: EventCancellationEmailProps) {
  return (
    <BaseLayout
      gymLogoUrl={gymLogoUrl}
      gymName={gymName}
      preview={`${eventTitle} has been canceled`}
    >
      <Heading className="mb-6 text-center font-bold text-2xl text-zinc-900">
        Event Canceled
      </Heading>

      <Text className="mb-4 text-base text-zinc-900">
        Hi {athleteName.split(" ")[0] || "there"},
      </Text>

      <Text className="mb-6 text-[15px] text-gray-600 leading-6">
        We wanted to let you know that the following event has been canceled:
      </Text>

      {/* Event Card */}
      <Section className="mb-6 flex items-center gap-4 rounded-xl bg-gray-50 p-4">
        <div className="min-w-[60px] rounded-lg bg-red-600 px-4 py-3 text-center">
          <Text className="m-0 font-bold text-2xl text-white leading-none">
            {eventDate.split(" ")[0]}
          </Text>
          <Text className="mt-1 mb-0 font-medium text-red-200 text-xs uppercase">
            {eventDate.split(" ")[1]}
          </Text>
        </div>
        <div className="flex-1">
          <Text className="mt-0 mb-1 font-semibold text-base text-zinc-900">
            {eventTitle}
          </Text>
          <Text className="m-0 text-gray-500 text-sm">{eventTime}</Text>
          {eventLocation && (
            <Text className="m-0 text-gray-500 text-sm">{eventLocation}</Text>
          )}
        </div>
      </Section>

      <Text className="mb-6 text-[15px] text-gray-600 leading-6">
        We apologize for any inconvenience this may cause. Please check the app
        for updates on future events.
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
