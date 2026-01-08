import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

// Enums
export const userRoleEnum = pgEnum("UserRole", ["owner", "coach", "athlete"]);
export const eventOccurrenceStatusEnum = pgEnum("EventOccurrenceStatus", [
  "scheduled",
  "canceled",
]);
export const rsvpStatusEnum = pgEnum("RSVPStatus", ["going", "not_going"]);
export const channelTypeEnum = pgEnum("ChannelType", ["global", "dm", "group"]);

// User table
export const users = pgTable(
  "User",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    altEmail: varchar("altEmail", { length: 255 }),
    name: varchar("name", { length: 255 }),
    phone: varchar("phone", { length: 50 }),
    address: text("address"),
    homePhone: varchar("homePhone", { length: 50 }),
    workPhone: varchar("workPhone", { length: 50 }),
    cellPhone: varchar("cellPhone", { length: 50 }),
    emergencyContactName: varchar("emergencyContactName", { length: 255 }),
    emergencyContactPhone: varchar("emergencyContactPhone", { length: 50 }),
    emergencyContactRelationship: varchar("emergencyContactRelationship", {
      length: 100,
    }),
    emergencyContactEmail: varchar("emergencyContactEmail", { length: 255 }),
    // Medical information
    medicalConditions: text("medicalConditions"),
    medications: text("medications"),
    allergies: text("allergies"),
    dateOfBirth: timestamp("dateOfBirth", { mode: "date" }),
    joinDate: timestamp("joinDate", { mode: "date" }),
    role: userRoleEnum("role").notNull(),
    gymId: uuid("gymId"),
    onboarded: boolean("onboarded").default(false).notNull(),
    avatarUrl: varchar("avatarUrl", { length: 500 }),
    pushToken: varchar("pushToken", { length: 500 }),
    notifPreferences: jsonb("notifPreferences").default({}),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => ({
    gymIdIdx: index("User_gymId_idx").on(table.gymId),
    emailIdx: index("User_email_idx").on(table.email),
  })
);

// Gym table
export const gyms = pgTable(
  "Gym",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    logoUrl: varchar("logoUrl", { length: 500 }),
    website: varchar("website", { length: 500 }),
    createdById: uuid("createdById").notNull().unique(),
    emailSettings: jsonb("emailSettings").default({
      enabled: true,
      reminderEnabled: true,
      announcementEnabled: true,
    }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => ({
    createdByIdIdx: index("Gym_createdById_idx").on(table.createdById),
  })
);

// Event table
export const events = pgTable(
  "Event",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gymId: uuid("gymId").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    location: varchar("location", { length: 255 }),
    recurrenceRule: text("recurrenceRule"),
    recurrenceEndDate: timestamp("recurrenceEndDate"), // When recurrence ends
    recurrenceCount: integer("recurrenceCount"), // Number of occurrences
    startTime: varchar("startTime", { length: 10 }).notNull(),
    endTime: varchar("endTime", { length: 10 }).notNull(),
    reminderDays: integer("reminderDays").array(), // PostgreSQL integer[] array - days before event to send reminders
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => ({
    gymIdIdx: index("Event_gymId_idx").on(table.gymId),
  })
);

// EventOccurrence table
export const eventOccurrences = pgTable(
  "EventOccurrence",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("eventId").notNull(),
    date: timestamp("date").notNull(),
    status: eventOccurrenceStatusEnum("status").default("scheduled").notNull(),
    note: text("note"), // Optional note for this occurrence
    isCustom: boolean("isCustom").default(false), // True if manually added (not from recurrence)
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => ({
    eventIdIdx: index("EventOccurrence_eventId_idx").on(table.eventId),
    dateIdx: index("EventOccurrence_date_idx").on(table.date),
    uniqueEventDate: unique("EventOccurrence_eventId_date_key").on(
      table.eventId,
      table.date
    ),
  })
);

// RSVP table
export const rsvps = pgTable(
  "RSVP",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("userId").notNull(),
    occurrenceId: uuid("occurrenceId").notNull(),
    status: rsvpStatusEnum("status").default("going").notNull(),
    updatedBy: uuid("updatedBy"), // Track who updated (for coach edits)
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("RSVP_userId_idx").on(table.userId),
    occurrenceIdIdx: index("RSVP_occurrenceId_idx").on(table.occurrenceId),
    uniqueUserOccurrence: unique("RSVP_userId_occurrenceId_key").on(
      table.userId,
      table.occurrenceId
    ),
  })
);

// Invitation table
export const invitations = pgTable(
  "Invitation",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gymId: uuid("gymId").notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    role: userRoleEnum("role").notNull(),
    token: varchar("token", { length: 255 }).notNull().unique(),
    invitedById: uuid("invitedById").notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    used: boolean("used").default(false).notNull(),
    // Additional user info (optional, can be pre-filled)
    name: varchar("name", { length: 255 }),
    phone: varchar("phone", { length: 50 }),
    address: text("address"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => ({
    tokenIdx: index("Invitation_token_idx").on(table.token),
    emailIdx: index("Invitation_email_idx").on(table.email),
    gymIdIdx: index("Invitation_gymId_idx").on(table.gymId),
  })
);

// Announcement table
export const announcements = pgTable(
  "Announcement",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gymId: uuid("gymId").notNull(),
    coachId: uuid("coachId").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => ({
    gymIdIdx: index("Announcement_gymId_idx").on(table.gymId),
    coachIdIdx: index("Announcement_coachId_idx").on(table.coachId),
  })
);

// Channel table
export const channels = pgTable(
  "Channel",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gymId: uuid("gymId").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    type: channelTypeEnum("type").notNull(),
    eventId: uuid("eventId"), // Optional: link to event for event-based chats
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => ({
    gymIdIdx: index("Channel_gymId_idx").on(table.gymId),
    typeIdx: index("Channel_type_idx").on(table.type),
    eventIdIdx: index("Channel_eventId_idx").on(table.eventId),
  })
);

// Message table
export const messages = pgTable(
  "Message",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gymId: uuid("gymId").notNull(),
    channelId: uuid("channelId").notNull(),
    senderId: uuid("senderId").notNull(),
    content: text("content").notNull(),
    attachmentUrl: varchar("attachmentUrl", { length: 500 }),
    attachmentType: varchar("attachmentType", { length: 50 }), // 'image', 'file', etc.
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => ({
    gymIdIdx: index("Message_gymId_idx").on(table.gymId),
    channelIdIdx: index("Message_channelId_idx").on(table.channelId),
    senderIdIdx: index("Message_senderId_idx").on(table.senderId),
    createdAtIdx: index("Message_createdAt_idx").on(table.createdAt),
  })
);

// ChatNotification table - tracks unread messages
export const chatNotifications = pgTable(
  "ChatNotification",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("userId").notNull(),
    channelId: uuid("channelId").notNull(),
    messageId: uuid("messageId").notNull(),
    readAt: timestamp("readAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    userIdChannelIdIdx: index("ChatNotification_userId_channelId_idx").on(
      table.userId,
      table.channelId
    ),
    userIdReadAtIdx: index("ChatNotification_userId_readAt_idx").on(
      table.userId,
      table.readAt
    ),
    channelIdIdx: index("ChatNotification_channelId_idx").on(table.channelId),
  })
);

// Blog Post table
export const blogPosts = pgTable(
  "BlogPost",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gymId: uuid("gymId").notNull(),
    authorId: uuid("authorId").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    content: text("content").notNull(),
    type: varchar("type", { length: 50 }).notNull(), // 'about', 'schedule', 'event', 'general'
    eventId: uuid("eventId"), // Optional: link to event
    imageUrl: varchar("imageUrl", { length: 500 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => ({
    gymIdIdx: index("BlogPost_gymId_idx").on(table.gymId),
    authorIdIdx: index("BlogPost_authorId_idx").on(table.authorId),
    eventIdIdx: index("BlogPost_eventId_idx").on(table.eventId),
    createdAtIdx: index("BlogPost_createdAt_idx").on(table.createdAt),
  })
);

// Notice table (only one active notice per gym)
export const notices = pgTable(
  "Notice",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gymId: uuid("gymId").notNull(),
    authorId: uuid("authorId").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    content: text("content").notNull(),
    active: boolean("active").default(false).notNull(),
    sendEmail: boolean("sendEmail").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => ({
    gymIdIdx: index("Notice_gymId_idx").on(table.gymId),
    authorIdIdx: index("Notice_authorId_idx").on(table.authorId),
    activeIdx: index("Notice_active_idx").on(table.active),
  })
);

// ReminderLog table
export const reminderLogs = pgTable(
  "ReminderLog",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    occurrenceId: uuid("occurrenceId").notNull(),
    userId: uuid("userId").notNull(),
    reminderType: varchar("reminderType", { length: 50 }).notNull(),
    sentAt: timestamp("sentAt").defaultNow().notNull(),
  },
  (table) => ({
    occurrenceIdIdx: index("ReminderLog_occurrenceId_idx").on(
      table.occurrenceId
    ),
    userIdIdx: index("ReminderLog_userId_idx").on(table.userId),
    uniqueReminderLog: unique("ReminderLog_unique").on(
      table.occurrenceId,
      table.userId,
      table.reminderType
    ),
  })
);

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  gym: one(gyms, {
    fields: [users.gymId],
    references: [gyms.id],
  }),
  createdGym: one(gyms, {
    fields: [users.id],
    references: [gyms.createdById],
    relationName: "GymOwner",
  }),
  rsvps: many(rsvps),
  invitations: many(invitations),
  sentMessages: many(messages, { relationName: "MessageSender" }),
  announcements: many(announcements),
  reminderLogs: many(reminderLogs),
  blogPosts: many(blogPosts),
  notices: many(notices),
  chatNotifications: many(chatNotifications),
}));

export const gymsRelations = relations(gyms, ({ one, many }) => ({
  owner: one(users, {
    fields: [gyms.createdById],
    references: [users.id],
    relationName: "HeadCoach",
  }),
  members: many(users),
  events: many(events),
  channels: many(channels),
  announcements: many(announcements),
  invitations: many(invitations),
  messages: many(messages),
  blogPosts: many(blogPosts),
  notices: many(notices),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  gym: one(gyms, {
    fields: [events.gymId],
    references: [gyms.id],
  }),
  occurrences: many(eventOccurrences),
  channels: many(channels),
  blogPosts: many(blogPosts),
}));

export const eventOccurrencesRelations = relations(
  eventOccurrences,
  ({ one, many }) => ({
    event: one(events, {
      fields: [eventOccurrences.eventId],
      references: [events.id],
    }),
    rsvps: many(rsvps),
    reminderLogs: many(reminderLogs),
  })
);

export const rsvpsRelations = relations(rsvps, ({ one }) => ({
  user: one(users, {
    fields: [rsvps.userId],
    references: [users.id],
  }),
  occurrence: one(eventOccurrences, {
    fields: [rsvps.occurrenceId],
    references: [eventOccurrences.id],
  }),
  updatedByUser: one(users, {
    fields: [rsvps.updatedBy],
    references: [users.id],
    relationName: "RsvpUpdater",
  }),
}));

export const invitationsRelations = relations(invitations, ({ one }) => ({
  gym: one(gyms, {
    fields: [invitations.gymId],
    references: [gyms.id],
  }),
  invitedBy: one(users, {
    fields: [invitations.invitedById],
    references: [users.id],
  }),
}));

export const announcementsRelations = relations(announcements, ({ one }) => ({
  gym: one(gyms, {
    fields: [announcements.gymId],
    references: [gyms.id],
  }),
  coach: one(users, {
    fields: [announcements.coachId],
    references: [users.id],
  }),
}));

export const channelsRelations = relations(channels, ({ one, many }) => ({
  gym: one(gyms, {
    fields: [channels.gymId],
    references: [gyms.id],
  }),
  event: one(events, {
    fields: [channels.eventId],
    references: [events.id],
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one, many }) => ({
  gym: one(gyms, {
    fields: [messages.gymId],
    references: [gyms.id],
  }),
  channel: one(channels, {
    fields: [messages.channelId],
    references: [channels.id],
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
    relationName: "MessageSender",
  }),
  notifications: many(chatNotifications),
}));

export const reminderLogsRelations = relations(reminderLogs, ({ one }) => ({
  occurrence: one(eventOccurrences, {
    fields: [reminderLogs.occurrenceId],
    references: [eventOccurrences.id],
  }),
  user: one(users, {
    fields: [reminderLogs.userId],
    references: [users.id],
  }),
}));

export const blogPostsRelations = relations(blogPosts, ({ one }) => ({
  gym: one(gyms, {
    fields: [blogPosts.gymId],
    references: [gyms.id],
  }),
  author: one(users, {
    fields: [blogPosts.authorId],
    references: [users.id],
  }),
  event: one(events, {
    fields: [blogPosts.eventId],
    references: [events.id],
  }),
}));

export const noticesRelations = relations(notices, ({ one }) => ({
  gym: one(gyms, {
    fields: [notices.gymId],
    references: [gyms.id],
  }),
  author: one(users, {
    fields: [notices.authorId],
    references: [users.id],
  }),
}));

export const chatNotificationsRelations = relations(
  chatNotifications,
  ({ one }) => ({
    user: one(users, {
      fields: [chatNotifications.userId],
      references: [users.id],
    }),
    channel: one(channels, {
      fields: [chatNotifications.channelId],
      references: [channels.id],
    }),
    message: one(messages, {
      fields: [chatNotifications.messageId],
      references: [messages.id],
    }),
  })
);
