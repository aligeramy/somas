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
  reminderType,
  rsvpUrl,
}: EventReminderEmailProps) {
  const reminderText = getReminderText(reminderType);

  return (
    <BaseLayout
      preview={`${eventTitle} - ${reminderText}`}
      gymName={gymName}
      gymLogoUrl={gymLogoUrl}
    >
      <Heading className="text-2xl font-bold text-zinc-900 mb-6 text-center">
        {reminderText}
      </Heading>

      <Text className="text-base text-zinc-900 mb-4">
        Hey {athleteName.split(" ")[0] || "there"},
      </Text>

      <Text className="text-[15px] text-gray-600 leading-6 mb-6">
        Just a friendly reminder about your upcoming session.
      </Text>

      {/* Event Card */}
      <Section className="bg-gray-50 rounded-xl p-4 mb-6 flex items-center gap-4">
        <div className="bg-zinc-900 rounded-lg py-3 px-4 text-center min-w-[60px]">
          <Text className="text-white text-2xl font-bold m-0 leading-none">
            {eventDate.split(" ")[0]}
          </Text>
          <Text className="text-zinc-400 text-xs font-medium mt-1 mb-0 uppercase">
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
        Let us know if you're coming!
      </Text>

      <Section className="text-center mb-6">
        <Button
          className="bg-zinc-900 rounded-lg text-white text-[15px] font-semibold no-underline text-center py-3.5 px-7"
          href={rsvpUrl}
        >
          Confirm Attendance
        </Button>
      </Section>

      <Text className="text-[13px] text-gray-400 text-center m-0">
        Can't make it? Update your RSVP to let the coach know.
      </Text>
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
