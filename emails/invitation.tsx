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
      preview={`You're invited to join ${gymName}`}
      gymName={gymName}
      gymLogoUrl={gymLogoUrl}
    >
      <Heading className="text-[28px] font-bold text-zinc-900 mb-6 text-center">
        You're Invited!
      </Heading>

      <Text className="text-base text-zinc-900 mb-4">Hello,</Text>

      <Text className="text-[15px] text-gray-600 leading-6 mb-6">
        <strong>{inviterName}</strong> has invited you to join{" "}
        <strong>{gymName}</strong> as{" "}
        {role === "coach" ? "a coach" : "an athlete"}.
      </Text>

      <Section className="bg-green-50 border-l-4 border-green-500 rounded-r-lg p-4 mb-6">
        <Text className="text-sm text-green-800 m-0 leading-[22px]">
          {role === "coach"
            ? "As a coach, you'll be able to create and manage events, track RSVPs, and communicate with athletes."
            : "As an athlete, you'll be able to RSVP to training sessions, receive reminders, and stay connected with your team."}
        </Text>
      </Section>

      <Text className="text-[15px] text-gray-600 leading-6 mb-6">
        Click the button below to set up your account and get started.
      </Text>

      <Section className="text-center mb-6">
        <Button
          className="bg-zinc-900 rounded-lg text-white text-[15px] font-semibold no-underline text-center py-3.5 px-8"
          href={inviteUrl}
        >
          Accept Invitation
        </Button>
      </Section>

      <Text className="text-[13px] text-gray-400 text-center m-0">
        This invitation link will expire in 7 days.
      </Text>
    </BaseLayout>
  );
}

export default InvitationEmail;
