import { Button, Heading, Section, Text } from "@react-email/components";
import { BaseLayout } from "./base-layout";

interface InvitationEmailProps {
  gymName: string;
  gymLogoUrl?: string | null;
  inviterName: string;
  role: "coach" | "athlete";
  inviteUrl: string;
}

export function InvitationEmail({
  gymName,
  gymLogoUrl,
  inviterName,
  role,
  inviteUrl,
}: InvitationEmailProps) {
  return (
    <BaseLayout
      gymLogoUrl={gymLogoUrl}
      gymName={gymName}
      preview={`You're invited to join ${gymName}`}
    >
      <Heading className="mb-6 text-center font-bold text-[28px] text-zinc-900">
        You're Invited!
      </Heading>

      <Text className="mb-4 text-base text-zinc-900">Hello,</Text>

      <Text className="mb-6 text-[15px] text-gray-600 leading-6">
        <strong>{inviterName}</strong> has invited you to join{" "}
        <strong>{gymName}</strong> as{" "}
        {role === "coach" ? "a coach" : "an athlete"}.
      </Text>

      <Section className="mb-6 rounded-r-lg border-green-500 border-l-4 bg-green-50 p-4">
        <Text className="m-0 text-green-800 text-sm leading-[22px]">
          {role === "coach"
            ? "As a coach, you'll be able to create and manage events, track RSVPs, and communicate with athletes."
            : "As an athlete, you'll be able to RSVP to training sessions, receive reminders, and stay connected with your team."}
        </Text>
      </Section>

      <Text className="mb-6 text-[15px] text-gray-600 leading-6">
        Click the button below to set up your account and get started.
      </Text>

      <Section className="mb-6 text-center">
        <Button
          className="rounded-lg bg-zinc-900 px-8 py-3.5 text-center font-semibold text-[15px] text-white no-underline"
          href={inviteUrl}
        >
          Accept Invitation
        </Button>
      </Section>

      <Text className="m-0 text-center text-[13px] text-gray-400">
        This invitation link will expire in 7 days.
      </Text>
    </BaseLayout>
  );
}

export default InvitationEmail;
