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
      preview={`Welcome to ${gymName}!`}
      gymName={gymName}
      gymLogoUrl={gymLogoUrl}
    >
      <Heading className="text-[28px] font-bold text-zinc-900 mb-6 text-center">
        Welcome to SOMAS App!
      </Heading>

      <Text className="text-base text-zinc-900 mb-4">
        Hi {userName.split(" ")[0] || "there"},
      </Text>

      <Text className="text-[15px] text-gray-600 leading-6 mb-6">
        We're excited to have you join <strong>{gymName || "SOMAS"}</strong> on
        the SOMAS App! Your account has been created and you're all set to start
        managing your training schedule, RSVPs, and team communication.
      </Text>

      <Section className="text-center mb-6">
        <Button
          className="bg-zinc-900 rounded-lg text-white text-[15px] font-semibold no-underline text-center py-3.5 px-8"
          href={setupUrl}
        >
          Set Up Your Account
        </Button>
      </Section>

      <Text className="text-[13px] text-gray-500 leading-6 mb-4">
        This link will expire in 24 hours for security. If you need a new link,
        please contact your coach.
      </Text>

      <Text className="text-[13px] text-gray-400 text-center m-0">
        If you didn't expect this email, you can safely ignore it.
      </Text>
    </BaseLayout>
  );
}

export default WelcomeEmail;
