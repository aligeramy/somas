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
    <BaseLayout preview={noticeTitle} gymName={gymName} gymLogoUrl={gymLogoUrl}>
      <Heading className="text-[28px] font-bold text-zinc-900 mb-6 text-center">
        {noticeTitle}
      </Heading>

      <Text className="text-base text-zinc-900 mb-4">
        Hi {userName.split(" ")[0] || "there"},
      </Text>

      <Section className="bg-zinc-50 rounded-xl p-4 mb-6">
        <Text className="text-[15px] text-gray-700 leading-6 m-0 whitespace-pre-wrap">
          {noticeContent}
        </Text>
      </Section>

      {authorName && (
        <Text className="text-[13px] text-gray-500 text-center m-0">
          — {authorName}
        </Text>
      )}

      <Text className="text-[13px] text-gray-400 text-center mt-6 mb-0">
        This notice was sent from {gymName || "your gym"}. You can view all
        notices in the app.
      </Text>
    </BaseLayout>
  );
}

export default NoticeEmail;
