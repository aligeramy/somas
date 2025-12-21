CREATE TYPE "public"."ChannelType" AS ENUM('global', 'dm', 'group');--> statement-breakpoint
CREATE TYPE "public"."EventOccurrenceStatus" AS ENUM('scheduled', 'canceled');--> statement-breakpoint
CREATE TYPE "public"."RSVPStatus" AS ENUM('going', 'not_going');--> statement-breakpoint
CREATE TYPE "public"."UserRole" AS ENUM('owner', 'coach', 'athlete');--> statement-breakpoint
CREATE TABLE "Announcement" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gymId" uuid NOT NULL,
	"coachId" uuid NOT NULL,
	"content" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "BlogPost" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gymId" uuid NOT NULL,
	"authorId" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"type" varchar(50) NOT NULL,
	"eventId" uuid,
	"imageUrl" varchar(500),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Channel" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gymId" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" "ChannelType" NOT NULL,
	"eventId" uuid,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ChatNotification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"channelId" uuid NOT NULL,
	"messageId" uuid NOT NULL,
	"readAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "EventOccurrence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"eventId" uuid NOT NULL,
	"date" timestamp NOT NULL,
	"status" "EventOccurrenceStatus" DEFAULT 'scheduled' NOT NULL,
	"note" text,
	"isCustom" boolean DEFAULT false,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "EventOccurrence_eventId_date_key" UNIQUE("eventId","date")
);
--> statement-breakpoint
CREATE TABLE "Event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gymId" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"location" varchar(255),
	"recurrenceRule" text,
	"recurrenceEndDate" timestamp,
	"recurrenceCount" integer,
	"startTime" varchar(10) NOT NULL,
	"endTime" varchar(10) NOT NULL,
	"reminderDays" integer[],
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Gym" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"logoUrl" varchar(500),
	"website" varchar(500),
	"createdById" uuid NOT NULL,
	"emailSettings" jsonb DEFAULT '{"enabled":true,"reminderEnabled":true,"announcementEnabled":true}'::jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "Gym_createdById_unique" UNIQUE("createdById")
);
--> statement-breakpoint
CREATE TABLE "Invitation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gymId" uuid NOT NULL,
	"email" varchar(255) NOT NULL,
	"role" "UserRole" NOT NULL,
	"token" varchar(255) NOT NULL,
	"invitedById" uuid NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"used" boolean DEFAULT false NOT NULL,
	"name" varchar(255),
	"phone" varchar(50),
	"address" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "Invitation_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "Message" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gymId" uuid NOT NULL,
	"channelId" uuid NOT NULL,
	"senderId" uuid NOT NULL,
	"content" text NOT NULL,
	"attachmentUrl" varchar(500),
	"attachmentType" varchar(50),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Notice" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gymId" uuid NOT NULL,
	"authorId" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"active" boolean DEFAULT false NOT NULL,
	"sendEmail" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ReminderLog" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"occurrenceId" uuid NOT NULL,
	"userId" uuid NOT NULL,
	"reminderType" varchar(50) NOT NULL,
	"sentAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ReminderLog_unique" UNIQUE("occurrenceId","userId","reminderType")
);
--> statement-breakpoint
CREATE TABLE "RSVP" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"occurrenceId" uuid NOT NULL,
	"status" "RSVPStatus" DEFAULT 'going' NOT NULL,
	"updatedBy" uuid,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "RSVP_userId_occurrenceId_key" UNIQUE("userId","occurrenceId")
);
--> statement-breakpoint
CREATE TABLE "User" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"altEmail" varchar(255),
	"name" varchar(255),
	"phone" varchar(50),
	"address" text,
	"homePhone" varchar(50),
	"workPhone" varchar(50),
	"cellPhone" varchar(50),
	"emergencyContactName" varchar(255),
	"emergencyContactPhone" varchar(50),
	"emergencyContactRelationship" varchar(100),
	"emergencyContactEmail" varchar(255),
	"medicalConditions" text,
	"medications" text,
	"allergies" text,
	"dateOfBirth" timestamp,
	"joinDate" timestamp,
	"role" "UserRole" NOT NULL,
	"gymId" uuid,
	"onboarded" boolean DEFAULT false NOT NULL,
	"avatarUrl" varchar(500),
	"pushToken" varchar(500),
	"notifPreferences" jsonb DEFAULT '{}'::jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "User_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE INDEX "Announcement_gymId_idx" ON "Announcement" USING btree ("gymId");--> statement-breakpoint
CREATE INDEX "Announcement_coachId_idx" ON "Announcement" USING btree ("coachId");--> statement-breakpoint
CREATE INDEX "BlogPost_gymId_idx" ON "BlogPost" USING btree ("gymId");--> statement-breakpoint
CREATE INDEX "BlogPost_authorId_idx" ON "BlogPost" USING btree ("authorId");--> statement-breakpoint
CREATE INDEX "BlogPost_eventId_idx" ON "BlogPost" USING btree ("eventId");--> statement-breakpoint
CREATE INDEX "BlogPost_createdAt_idx" ON "BlogPost" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "Channel_gymId_idx" ON "Channel" USING btree ("gymId");--> statement-breakpoint
CREATE INDEX "Channel_type_idx" ON "Channel" USING btree ("type");--> statement-breakpoint
CREATE INDEX "Channel_eventId_idx" ON "Channel" USING btree ("eventId");--> statement-breakpoint
CREATE INDEX "ChatNotification_userId_channelId_idx" ON "ChatNotification" USING btree ("userId","channelId");--> statement-breakpoint
CREATE INDEX "ChatNotification_userId_readAt_idx" ON "ChatNotification" USING btree ("userId","readAt");--> statement-breakpoint
CREATE INDEX "ChatNotification_channelId_idx" ON "ChatNotification" USING btree ("channelId");--> statement-breakpoint
CREATE INDEX "EventOccurrence_eventId_idx" ON "EventOccurrence" USING btree ("eventId");--> statement-breakpoint
CREATE INDEX "EventOccurrence_date_idx" ON "EventOccurrence" USING btree ("date");--> statement-breakpoint
CREATE INDEX "Event_gymId_idx" ON "Event" USING btree ("gymId");--> statement-breakpoint
CREATE INDEX "Gym_createdById_idx" ON "Gym" USING btree ("createdById");--> statement-breakpoint
CREATE INDEX "Invitation_token_idx" ON "Invitation" USING btree ("token");--> statement-breakpoint
CREATE INDEX "Invitation_email_idx" ON "Invitation" USING btree ("email");--> statement-breakpoint
CREATE INDEX "Invitation_gymId_idx" ON "Invitation" USING btree ("gymId");--> statement-breakpoint
CREATE INDEX "Message_gymId_idx" ON "Message" USING btree ("gymId");--> statement-breakpoint
CREATE INDEX "Message_channelId_idx" ON "Message" USING btree ("channelId");--> statement-breakpoint
CREATE INDEX "Message_senderId_idx" ON "Message" USING btree ("senderId");--> statement-breakpoint
CREATE INDEX "Message_createdAt_idx" ON "Message" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "Notice_gymId_idx" ON "Notice" USING btree ("gymId");--> statement-breakpoint
CREATE INDEX "Notice_authorId_idx" ON "Notice" USING btree ("authorId");--> statement-breakpoint
CREATE INDEX "Notice_active_idx" ON "Notice" USING btree ("active");--> statement-breakpoint
CREATE INDEX "ReminderLog_occurrenceId_idx" ON "ReminderLog" USING btree ("occurrenceId");--> statement-breakpoint
CREATE INDEX "ReminderLog_userId_idx" ON "ReminderLog" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "RSVP_userId_idx" ON "RSVP" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "RSVP_occurrenceId_idx" ON "RSVP" USING btree ("occurrenceId");--> statement-breakpoint
CREATE INDEX "User_gymId_idx" ON "User" USING btree ("gymId");--> statement-breakpoint
CREATE INDEX "User_email_idx" ON "User" USING btree ("email");