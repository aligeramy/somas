import { Button, Heading, Section, Text } from "@react-email/components";
import { BaseLayout } from "./base-layout";

interface PasswordResetEmailProps {
  gymName: string | null;
  gymLogoUrl?: string | null;
  userName: string;
  resetUrl: string;
}

export function PasswordResetEmail({
  gymName,
  gymLogoUrl,
  userName,
  resetUrl,
}: PasswordResetEmailProps) {
  return (
    <BaseLayout
      preview={`Reset your password for ${gymName}`}
      gymName={gymName}
      gymLogoUrl={gymLogoUrl}
    >
      <Heading className="text-[28px] font-bold text-zinc-900 mb-6 text-center">
        Reset Your Password
      </Heading>

      <Text className="text-base text-zinc-900 mb-4">
        Hi {userName.split(" ")[0] || "there"},
      </Text>

      <Text className="text-[15px] text-gray-600 leading-6 mb-6">
        We received a request to reset your password for your <strong>{gymName || "TOM"}</strong> account. Click the button below to set a new password.
      </Text>

      <Section className="text-center mb-6">
        <Button
          className="bg-zinc-900 rounded-lg text-white text-[15px] font-semibold no-underline text-center py-3.5 px-8"
          href={resetUrl}
        >
          Reset Password
        </Button>
      </Section>

      <Text className="text-[13px] text-gray-500 leading-6 mb-4">
        This link will expire in 24 hours for security. If you didn't request a password reset, you can safely ignore this email.
      </Text>

      <Text className="text-[13px] text-gray-400 text-center m-0">
        If you're having trouble, please contact your coach for assistance.
      </Text>
    </BaseLayout>
  );
}

export default PasswordResetEmail;

