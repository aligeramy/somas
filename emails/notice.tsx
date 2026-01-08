import { Heading, Section, Text } from "@react-email/components";
import { BaseLayout } from "./base-layout";

interface NoticeEmailProps {
  gymName: string | null;
  gymLogoUrl?: string | null;
  userName: string;
  noticeTitle: string;
  noticeContent: string;
  authorName: string | null;
}

export function NoticeEmail({
  gymName,
  gymLogoUrl,
  userName,
  noticeTitle,
  noticeContent,
  authorName,
}: NoticeEmailProps) {
  return (
    <BaseLayout gymLogoUrl={gymLogoUrl} gymName={gymName} preview={noticeTitle}>
      <Heading className="mb-6 text-center font-bold text-[28px] text-zinc-900">
        {noticeTitle}
      </Heading>

      <Text className="mb-4 text-base text-zinc-900">
        Hi {userName.split(" ")[0] || "there"},
      </Text>

      <Section className="mb-6 rounded-xl bg-zinc-50 p-4">
        <Text className="m-0 whitespace-pre-wrap text-[15px] text-gray-700 leading-6">
          {noticeContent}
        </Text>
      </Section>

      {authorName && (
        <Text className="m-0 text-center text-[13px] text-gray-500">
          — {authorName}
        </Text>
      )}

      <Text className="mt-6 mb-0 text-center text-[13px] text-gray-400">
        This notice was sent from {gymName || "your gym"}. You can view all
        notices in the app.
      </Text>
    </BaseLayout>
  );
}

export default NoticeEmail;
