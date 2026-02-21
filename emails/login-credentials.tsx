import { Button, Heading, Section, Text } from "@react-email/components";
import { BaseLayout } from "./base-layout";

interface LoginCredentialsEmailProps {
  gymName: string | null;
  gymLogoUrl?: string | null;
  userName: string;
  email: string;
  password: string;
  loginUrl: string;
}

export function LoginCredentialsEmail({
  gymName,
  gymLogoUrl,
  userName,
  email,
  password,
  loginUrl,
}: LoginCredentialsEmailProps) {
  return (
    <BaseLayout
      gymLogoUrl={gymLogoUrl}
      gymName={gymName}
      preview={`Welcome to ${gymName}! Your login credentials`}
    >
      <Heading className="mb-6 text-center font-bold text-[28px] text-zinc-900">
        Welcome to {gymName || "SOMAS"}!
      </Heading>

      <Text className="mb-4 text-base text-zinc-900">
        Hi {userName.split(" ")[0] || "there"},
      </Text>

      <Text className="mb-6 text-[15px] text-gray-600 leading-6">
        Your account has been created and you're all set to start managing your
        training schedule, RSVPs, and team communication.
      </Text>

      <Section className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
        <Text className="mb-2 font-semibold text-sm text-zinc-900">
          Your Login Credentials:
        </Text>
        <Text className="mb-1 text-gray-700 text-sm">
          <strong>Email:</strong> {email}
        </Text>
        <Text className="mb-0 text-gray-700 text-sm">
          <strong>Password:</strong>{" "}
          <code className="rounded border border-gray-300 bg-white px-2 py-1 font-mono">
            {password}
          </code>
        </Text>
      </Section>

      <Section className="mb-6 text-center">
        <Button
          className="rounded-lg bg-zinc-900 px-8 py-3.5 text-center font-semibold text-[15px] text-white no-underline"
          href={loginUrl}
        >
          Go to Login Page
        </Button>
      </Section>

      <Text className="mb-4 text-[13px] text-gray-500 leading-6">
        For security, we recommend changing your password after your first
        login. You can do this in your profile settings.
      </Text>

      <Text className="m-0 text-center text-[13px] text-gray-400">
        If you didn't expect this email, you can safely ignore it.
      </Text>
    </BaseLayout>
  );
}

export default LoginCredentialsEmail;
