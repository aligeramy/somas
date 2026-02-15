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
      preview={getSubject()}
      gymName={gymName}
      gymLogoUrl={gymLogoUrl}
    >
      <Heading className="text-2xl font-bold text-zinc-900 mb-6 text-center">
        New Message
      </Heading>

      <Text className="text-base text-zinc-900 mb-4">
        Hey {recipientName.split(" ")[0] || "there"},
      </Text>

      <Text className="text-[15px] text-gray-600 leading-6 mb-6">
        {channelType === "dm"
          ? `${senderName} sent you a message`
          : `${senderName} sent a message in ${channelName}`}
      </Text>

      {/* Message Preview Card */}
      <Section className="bg-gray-50 rounded-xl p-4 mb-6">
        <Text className="text-sm text-gray-500 mb-2 m-0 font-medium">
          {getChannelDisplayName()}
        </Text>
        <Text className="text-base text-zinc-900 m-0 leading-6">
          {messagePreview}
        </Text>
      </Section>

      <Section className="text-center mb-6">
        <Button
          className="bg-zinc-900 rounded-lg text-white text-[15px] font-semibold no-underline text-center py-3.5 px-7"
          href={chatUrl}
        >
          View Message
        </Button>
      </Section>

      <Text className="text-[13px] text-gray-400 text-center m-0">
        You're receiving this email because you have unread messages. You'll
        receive at most one email per day per conversation.
      </Text>
    </BaseLayout>
  );
}
