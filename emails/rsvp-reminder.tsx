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
      gymLogoUrl={gymLogoUrl}
      gymName={gymName}
      preview={`RSVP needed for ${eventTitle}`}
    >
      <Heading className="mb-6 text-center font-bold text-2xl text-zinc-900">
        We need your RSVP! 🙋
      </Heading>

      <Text className="mb-4 text-base text-zinc-900">
        Hey {athleteName.split(" ")[0] || "there"},
      </Text>

      <Text className="mb-6 text-[15px] text-gray-600 leading-6">
        You haven't responded to an upcoming event yet. Your coach would love to
        know if you're coming!
      </Text>

      {/* Event Card */}
      <Section className="mb-6 flex items-center gap-4 rounded-xl bg-amber-100 p-4">
        <div className="min-w-[60px] rounded-lg bg-amber-500 px-4 py-3 text-center">
          <Text className="m-0 font-bold text-2xl text-white leading-none">
            {eventDate.split(" ")[0]}
          </Text>
          <Text className="mt-1 mb-0 font-medium text-white/80 text-xs uppercase">
            {eventDate.split(" ")[1]}
          </Text>
        </div>
        <div className="flex-1">
          <Text className="mt-0 mb-1 font-semibold text-base text-zinc-900">
            {eventTitle}
          </Text>
          <Text className="m-0 text-gray-500 text-sm">{eventTime}</Text>
        </div>
      </Section>

      <Section className="mb-6 text-center">
        <Button
          className="mr-2 rounded-lg bg-emerald-500 px-5 py-3 text-center font-semibold text-sm text-white no-underline"
          href={`${rsvpUrl}?status=going`}
        >
          ✓ I'm Going
        </Button>
        <Button
          className="rounded-lg bg-gray-100 px-5 py-3 text-center font-semibold text-gray-600 text-sm no-underline"
          href={`${rsvpUrl}?status=not_going`}
        >
          ✗ Can't Make It
        </Button>
      </Section>

      <Text className="m-0 text-center text-[13px] text-gray-400">
        It only takes a second to let us know!
      </Text>
    </BaseLayout>
  );
}

export default RsvpReminderEmail;
