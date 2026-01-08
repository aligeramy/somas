import { Button, Heading, Section, Text } from "@react-email/components";
import { BaseLayout } from "./base-layout";

interface WelcomeEmailProps {
  gymName: string | null;
  gymLogoUrl?: string | null;
  userName: string;
  setupUrl: string;
}

export function WelcomeEmail({
  gymName,
  gymLogoUrl,
  userName,
  setupUrl,
}: WelcomeEmailProps) {
  return (
    <BaseLayout
      gymLogoUrl={gymLogoUrl}
      gymName={gymName}
      preview={`Welcome to ${gymName}!`}
    >
      <Heading className="mb-6 text-center font-bold text-[28px] text-zinc-900">
        Welcome to SOMAS App!
      </Heading>

      <Text className="mb-4 text-base text-zinc-900">
        Hi {userName.split(" ")[0] || "there"},
      </Text>

      <Text className="mb-6 text-[15px] text-gray-600 leading-6">
        We're excited to have you join <strong>{gymName || "SOMAS"}</strong> on
        the SOMAS App! Your account has been created and you're all set to start
        managing your training schedule, RSVPs, and team communication.
      </Text>

      <Section className="mb-6 text-center">
        <Button
          className="rounded-lg bg-zinc-900 px-8 py-3.5 text-center font-semibold text-[15px] text-white no-underline"
          href={setupUrl}
        >
          Set Up Your Account
        </Button>
      </Section>

      <Text className="mb-4 text-[13px] text-gray-500 leading-6">
        This link will expire in 24 hours for security. If you need a new link,
        please contact your coach.
      </Text>

      <Text className="m-0 text-center text-[13px] text-gray-400">
        If you didn't expect this email, you can safely ignore it.
      </Text>
    </BaseLayout>
  );
}

export default WelcomeEmail;
