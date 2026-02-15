-- Create ChatEmailLog table to track when emails were sent for chat notifications
CREATE TABLE IF NOT EXISTS "ChatEmailLog" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"channelId" uuid NOT NULL,
	"sentAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ChatEmailLog_userId_channelId_key" UNIQUE("userId","channelId")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ChatEmailLog_userId_channelId_idx" ON "ChatEmailLog"("userId","channelId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ChatEmailLog_userId_sentAt_idx" ON "ChatEmailLog"("userId","sentAt");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ChatEmailLog_channelId_idx" ON "ChatEmailLog"("channelId");
