import { Button, Heading, Section, Text } from "@react-email/components";
import { BaseLayout } from "./base-layout";

interface ChatNotificationEmailProps {
  gymName: string;
  gymLogoUrl?: string | null;
  recipientName: string;
  senderName: string;
  channelName: string;
  channelType: "dm" | "group" | "global";
  messagePreview: string;
  chatUrl: string;
}

export function ChatNotificationEmail({
  gymName,
  gymLogoUrl,
  recipientName,
  senderName,
  channelName,
  channelType,
  messagePreview,
  chatUrl,
}: ChatNotificationEmailProps) {
  const getSubject = () => {
    if (channelType === "dm") {
      return `${senderName} sent you a message`;
    }
    return `${senderName} sent a message in ${channelName}`;
  };

  const getChannelDisplayName = () => {
    if (channelType === "dm") {
      return senderName;
    }
    return channelName;
  };

  return (
    <BaseLayout
      gymLogoUrl={gymLogoUrl}
      gymName={gymName}
      preview={getSubject()}
    >
      <Heading className="mb-6 text-center font-bold text-2xl text-zinc-900">
        New Message
      </Heading>

      <Text className="mb-4 text-base text-zinc-900">
        Hey {recipientName.split(" ")[0] || "there"},
      </Text>

      <Text className="mb-6 text-[15px] text-gray-600 leading-6">
        {channelType === "dm"
          ? `${senderName} sent you a message`
          : `${senderName} sent a message in ${channelName}`}
      </Text>

      {/* Message Preview Card */}
      <Section className="mb-6 rounded-xl bg-gray-50 p-4">
        <Text className="m-0 mb-2 font-medium text-gray-500 text-sm">
          {getChannelDisplayName()}
        </Text>
        <Text className="m-0 text-base text-zinc-900 leading-6">
          {messagePreview}
        </Text>
      </Section>

      <Section className="mb-6 text-center">
        <Button
          className="rounded-lg bg-zinc-900 px-7 py-3.5 text-center font-semibold text-[15px] text-white no-underline"
          href={chatUrl}
        >
          View Message
        </Button>
      </Section>

      <Text className="m-0 text-center text-[13px] text-gray-400">
        You're receiving this email because you have unread messages. You'll
        receive at most one email per day per conversation.
      </Text>
    </BaseLayout>
  );
}
