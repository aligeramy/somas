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
      preview={`Welcome to ${gymName}! Your login credentials`}
      gymName={gymName}
      gymLogoUrl={gymLogoUrl}
    >
      <Heading className="text-[28px] font-bold text-zinc-900 mb-6 text-center">
        Welcome to {gymName || "SOMAS"}!
      </Heading>

      <Text className="text-base text-zinc-900 mb-4">
        Hi {userName.split(" ")[0] || "there"},
      </Text>

      <Text className="text-[15px] text-gray-600 leading-6 mb-6">
        Your account has been created and you're all set to start managing your
        training schedule, RSVPs, and team communication.
      </Text>

      <Section className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
        <Text className="text-sm font-semibold text-zinc-900 mb-2">
          Your Login Credentials:
        </Text>
        <Text className="text-sm text-gray-700 mb-1">
          <strong>Email:</strong> {email}
        </Text>
        <Text className="text-sm text-gray-700 mb-0">
          <strong>Password:</strong>{" "}
          <code className="bg-white px-2 py-1 rounded border border-gray-300 font-mono">
            {password}
          </code>
        </Text>
      </Section>

      <Section className="text-center mb-6">
        <Button
          className="bg-zinc-900 rounded-lg text-white text-[15px] font-semibold no-underline text-center py-3.5 px-8"
          href={loginUrl}
        >
          Go to Login Page
        </Button>
      </Section>

      <Text className="text-[13px] text-gray-500 leading-6 mb-4">
        For security, we recommend changing your password after your first
        login. You can do this in your profile settings.
      </Text>

      <Text className="text-[13px] text-gray-400 text-center m-0">
        If you didn't expect this email, you can safely ignore it.
      </Text>
    </BaseLayout>
  );
}

export default LoginCredentialsEmail;
