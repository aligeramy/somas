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
      preview={`${eventTitle} has been canceled`}
      gymName={gymName}
      gymLogoUrl={gymLogoUrl}
    >
      <Heading className="text-2xl font-bold text-zinc-900 mb-6 text-center">
        Event Canceled
      </Heading>

      <Text className="text-base text-zinc-900 mb-4">
        Hi {athleteName.split(" ")[0] || "there"},
      </Text>

      <Text className="text-[15px] text-gray-600 leading-6 mb-6">
        We wanted to let you know that the following event has been canceled:
      </Text>

      {/* Event Card */}
      <Section className="bg-gray-50 rounded-xl p-4 mb-6 flex items-center gap-4">
        <div className="bg-red-600 rounded-lg py-3 px-4 text-center min-w-[60px]">
          <Text className="text-white text-2xl font-bold m-0 leading-none">
            {eventDate.split(" ")[0]}
          </Text>
          <Text className="text-red-200 text-xs font-medium mt-1 mb-0 uppercase">
            {eventDate.split(" ")[1]}
          </Text>
        </div>
        <div className="flex-1">
          <Text className="text-base font-semibold text-zinc-900 mb-1 mt-0">
            {eventTitle}
          </Text>
          <Text className="text-sm text-gray-500 m-0">{eventTime}</Text>
          {eventLocation && (
            <Text className="text-sm text-gray-500 m-0">{eventLocation}</Text>
          )}
        </div>
      </Section>

      <Text className="text-[15px] text-gray-600 leading-6 mb-6">
        We apologize for any inconvenience this may cause. Please check the app
        for updates on future events.
      </Text>

      <Text className="text-[13px] text-gray-400 text-center m-0">
        View your events in the{" "}
        <a
          href={dashboardUrl}
          className="text-zinc-900 underline"
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
