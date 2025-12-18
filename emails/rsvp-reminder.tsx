import { Button, Heading, Section, Text } from "@react-email/components";
import { BaseLayout } from "./base-layout";

interface RsvpReminderEmailProps {
  gymName: string;
  gymLogoUrl?: string | null;
  athleteName: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  rsvpUrl: string;
}

export function RsvpReminderEmail({
  gymName,
  gymLogoUrl,
  athleteName,
  eventTitle,
  eventDate,
  eventTime,
  rsvpUrl,
}: RsvpReminderEmailProps) {
  return (
    <BaseLayout
      preview={`RSVP needed for ${eventTitle}`}
      gymName={gymName}
      gymLogoUrl={gymLogoUrl}
    >
      <Heading className="text-2xl font-bold text-zinc-900 mb-6 text-center">
        We need your RSVP! 🙋
      </Heading>

      <Text className="text-base text-zinc-900 mb-4">
        Hey {athleteName.split(" ")[0] || "there"},
      </Text>

      <Text className="text-[15px] text-gray-600 leading-6 mb-6">
        You haven't responded to an upcoming event yet. Your coach would love to
        know if you're coming!
      </Text>

      {/* Event Card */}
      <Section className="bg-amber-100 rounded-xl p-4 mb-6 flex items-center gap-4">
        <div className="bg-amber-500 rounded-lg py-3 px-4 text-center min-w-[60px]">
          <Text className="text-white text-2xl font-bold m-0 leading-none">
            {eventDate.split(" ")[0]}
          </Text>
          <Text className="text-white/80 text-xs font-medium mt-1 mb-0 uppercase">
            {eventDate.split(" ")[1]}
          </Text>
        </div>
        <div className="flex-1">
          <Text className="text-base font-semibold text-zinc-900 mb-1 mt-0">
            {eventTitle}
          </Text>
          <Text className="text-sm text-gray-500 m-0">{eventTime}</Text>
        </div>
      </Section>

      <Section className="text-center mb-6">
        <Button
          className="bg-emerald-500 rounded-lg text-white text-sm font-semibold no-underline text-center py-3 px-5 mr-2"
          href={`${rsvpUrl}?status=going`}
        >
          ✓ I'm Going
        </Button>
        <Button
          className="bg-gray-100 rounded-lg text-gray-600 text-sm font-semibold no-underline text-center py-3 px-5"
          href={`${rsvpUrl}?status=not_going`}
        >
          ✗ Can't Make It
        </Button>
      </Section>

      <Text className="text-[13px] text-gray-400 text-center m-0">
        It only takes a second to let us know!
      </Text>
    </BaseLayout>
  );
}

export default RsvpReminderEmail;

