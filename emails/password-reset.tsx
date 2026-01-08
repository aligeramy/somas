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
      gymLogoUrl={gymLogoUrl}
      gymName={gymName}
      preview={`Reset your password for ${gymName}`}
    >
      <Heading className="mb-6 text-center font-bold text-[28px] text-zinc-900">
        Reset Your Password
      </Heading>

      <Text className="mb-4 text-base text-zinc-900">
        Hi {userName.split(" ")[0] || "there"},
      </Text>

      <Text className="mb-6 text-[15px] text-gray-600 leading-6">
        We received a request to reset your password for your{" "}
        <strong>{gymName || "SOMAS"}</strong> account. Click the button below to
        set a new password.
      </Text>

      <Section className="mb-6 text-center">
        <Button
          className="rounded-lg bg-zinc-900 px-8 py-3.5 text-center font-semibold text-[15px] text-white no-underline"
          href={resetUrl}
        >
          Reset Password
        </Button>
      </Section>

      <Text className="mb-4 text-[13px] text-gray-500 leading-6">
        This link will expire in 24 hours for security. If you didn't request a
        password reset, you can safely ignore this email.
      </Text>

      <Text className="m-0 text-center text-[13px] text-gray-400">
        If you're having trouble, please contact your coach for assistance.
      </Text>
    </BaseLayout>
  );
}

export default PasswordResetEmail;
