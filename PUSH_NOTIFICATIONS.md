# Push Notifications Setup Guide

This guide explains how to set up push notifications for the TOM platform.

## Overview

The TOM platform supports push notifications for:
- **Event Reminders** - Automated reminders before events (7 days, 3 days, 1 day, 30 min)
- **RSVP Requests** - Manual nudges to pending RSVPs
- **Announcements** - Coach/owner announcements to all athletes
- **RSVP Changes** - Notify coaches when athletes change RSVPs

## Database Schema

The notification system uses the following tables:

### User Table
- `pushToken` - Stores the device push token (Expo/FCM/APNs)
- `notifPreferences` - JSON object with notification settings:
  ```json
  {
    "email": true,
    "push": true,
    "reminders": true
  }
  ```

### Gym Table
- `emailSettings` - JSON object for gym-wide email settings:
  ```json
  {
    "enabled": true,
    "reminderEnabled": true,
    "announcementEnabled": true
  }
  ```

### Event Table
- `reminderDays` - Array of reminder times before events:
  ```json
  [7, 3, 1, 0.02]  // 7 days, 3 days, 1 day, 30 min (0.02 = 30/1440 days)
  ```

### ReminderLog Table
Tracks sent reminders to prevent duplicates:
- `occurrenceId` - Event occurrence
- `userId` - User who received reminder
- `reminderType` - Type of reminder sent
- `sentAt` - Timestamp

## Expo Push Notifications Setup

### 1. Install Expo Dependencies

```bash
# In your Expo mobile app
npx expo install expo-notifications expo-device expo-constants
```

### 2. Configure app.json

```json
{
  "expo": {
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#18181b"
        }
      ]
    ]
  }
}
```

### 3. Request Permissions and Get Token

```tsx
// In your mobile app
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

async function registerForPushNotifications() {
  if (!Device.isDevice) {
    console.log('Push notifications only work on physical devices');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    console.log('Failed to get push token');
    return null;
  }

  const token = await Notifications.getExpoPushTokenAsync({
    projectId: Constants.expoConfig?.extra?.eas?.projectId,
  });

  return token.data;
}
```

### 4. Save Token to Backend

```tsx
// After getting the token
async function savePushToken(token: string) {
  await fetch('/api/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pushToken: token }),
  });
}
```

## Server-Side Push Notifications

### 1. Install Dependencies

```bash
pnpm add expo-server-sdk
```

### 2. Create Push Notification Service

```ts
// lib/push-notifications.ts
import Expo, { ExpoPushMessage } from 'expo-server-sdk';

const expo = new Expo();

export async function sendPushNotification(
  pushTokens: string[],
  title: string,
  body: string,
  data?: Record<string, unknown>
) {
  const messages: ExpoPushMessage[] = [];

  for (const pushToken of pushTokens) {
    if (!Expo.isExpoPushToken(pushToken)) {
      console.error(`Invalid Expo push token: ${pushToken}`);
      continue;
    }

    messages.push({
      to: pushToken,
      sound: 'default',
      title,
      body,
      data,
    });
  }

  const chunks = expo.chunkPushNotifications(messages);
  const tickets = [];

  for (const chunk of chunks) {
    try {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    } catch (error) {
      console.error('Error sending push notifications:', error);
    }
  }

  return tickets;
}
```

### 3. Scheduled Reminders (Cron Job)

Create an API endpoint or Edge Function to send scheduled reminders:

```ts
// app/api/cron/reminders/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { events, eventOccurrences, users, reminderLogs } from '@/drizzle/schema';
import { sendPushNotification } from '@/lib/push-notifications';
import { and, eq, gte, lte, not, inArray } from 'drizzle-orm';

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();

  // Find events with reminders due
  const eventsWithReminders = await db
    .select()
    .from(events)
    .innerJoin(eventOccurrences, eq(events.id, eventOccurrences.eventId))
    .where(
      and(
        eq(eventOccurrences.status, 'scheduled'),
        gte(eventOccurrences.date, now)
      )
    );

  for (const { Event: event, EventOccurrence: occurrence } of eventsWithReminders) {
    const reminderDays = event.reminderDays as number[];
    
    for (const days of reminderDays) {
      const reminderTime = new Date(occurrence.date);
      reminderTime.setMinutes(reminderTime.getMinutes() - days * 24 * 60);

      // Check if it's time to send this reminder
      if (now >= reminderTime && now <= new Date(reminderTime.getTime() + 5 * 60 * 1000)) {
        const reminderType = `${days}_day`;

        // Get users who haven't received this reminder
        const sentLogs = await db
          .select()
          .from(reminderLogs)
          .where(
            and(
              eq(reminderLogs.occurrenceId, occurrence.id),
              eq(reminderLogs.reminderType, reminderType)
            )
          );

        const sentUserIds = sentLogs.map(l => l.userId);

        // Get gym members with push tokens
        const members = await db
          .select()
          .from(users)
          .where(
            and(
              eq(users.gymId, event.gymId),
              eq(users.role, 'athlete'),
              not(inArray(users.id, sentUserIds))
            )
          );

        const pushTokens = members
          .filter(m => m.pushToken)
          .map(m => m.pushToken as string);

        if (pushTokens.length > 0) {
          await sendPushNotification(
            pushTokens,
            event.title,
            `Reminder: ${event.title} is ${formatReminderTime(days)} away`,
            { occurrenceId: occurrence.id, type: 'reminder' }
          );

          // Log reminders
          for (const member of members) {
            await db.insert(reminderLogs).values({
              occurrenceId: occurrence.id,
              userId: member.id,
              reminderType,
            }).onConflictDoNothing();
          }
        }
      }
    }
  }

  return NextResponse.json({ success: true });
}

function formatReminderTime(days: number): string {
  if (days >= 7) return '1 week';
  if (days >= 1) return `${days} day${days > 1 ? 's' : ''}`;
  const minutes = Math.round(days * 24 * 60);
  return `${minutes} minutes`;
}
```

## Vercel Cron Setup

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/reminders",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

Set environment variable:
```
CRON_SECRET=your-secret-key
```

## Testing Push Notifications

1. Use the Expo Go app on a physical device
2. Get your push token from the app
3. Use the Expo push notification tool: https://expo.dev/notifications
4. Or test via API using `curl`:

```bash
curl -X POST https://exp.host/--/api/v2/push/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "ExponentPushToken[xxxxxx]",
    "title": "Test Notification",
    "body": "This is a test push notification"
  }'
```

## Email Settings (Admin)

Admins can configure email settings in the Settings page:
- Enable/disable all emails
- Enable/disable reminder emails
- Enable/disable announcement emails

These settings are stored in the `Gym.emailSettings` JSONB column.

## Best Practices

1. **Always check user preferences** before sending notifications
2. **Log all sent reminders** to prevent duplicates
3. **Handle invalid push tokens** gracefully
4. **Batch notifications** when sending to many users
5. **Use meaningful data payloads** for deep linking
6. **Rate limit** notification endpoints

