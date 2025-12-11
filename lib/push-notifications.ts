import Expo, { ExpoPushMessage } from "expo-server-sdk";

const expo = new Expo();

export async function sendPushNotification(
  pushTokens: string[],
  title: string,
  body: string,
  data?: Record<string, unknown>
) {
  if (pushTokens.length === 0) {
    return [];
  }

  const messages: ExpoPushMessage[] = [];

  for (const pushToken of pushTokens) {
    if (!Expo.isExpoPushToken(pushToken)) {
      console.error(`Invalid Expo push token: ${pushToken}`);
      continue;
    }

    const message: ExpoPushMessage = {
      to: pushToken,
      sound: "default",
      title,
      body,
    };
    
    // Only add data if it's provided and is a valid object
    if (data && typeof data === "object" && Object.keys(data).length > 0) {
      message.data = data;
    }
    
    messages.push(message);
  }

  if (messages.length === 0) {
    return [];
  }

  const chunks = expo.chunkPushNotifications(messages);
  const tickets = [];

  for (const chunk of chunks) {
    try {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    } catch (error) {
      console.error("Error sending push notifications:", error);
    }
  }

  return tickets;
}
