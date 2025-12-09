# Chat and Blog System Setup

## Database Migrations Required

The following schema changes have been made to support chat, blog posts, and notices:

1. **Channels table** - Added `eventId` field for event-based chats
2. **Messages table** - Added `attachmentType` field for multimedia support
3. **BlogPosts table** - New table for blog posts
4. **Notices table** - New table for notices (only one active per gym)

You'll need to run database migrations to apply these changes.

## Features Implemented

### 1. Chat System
- **Chat Page** (`/chat`) - Main chat interface with channel selection
- **Realtime Chat Component** - Uses Supabase Realtime for instant messaging
- **Multimedia Support** - Image uploads via Supabase Storage
- **Event-based Chats** - Channels can be linked to events
- **Group Chats** - Support for creating group channels

### 2. Blog/Posts System
- **API Routes** (`/api/blog`) - CRUD operations for blog posts
- **Post Types** - Support for: `about`, `schedule`, `event`, `general`
- **Event Linking** - Posts can be linked to specific events
- **Image Support** - Posts can include images

### 3. Notices System
- **API Routes** (`/api/notices`) - Create and manage notices
- **Single Active Notice** - Only one notice can be active per gym at a time
- **Email Notifications** - Option to send notices via email to all members
- **Dashboard Display** - Active notice shown prominently on dashboard

### 4. Mobile Navigation Updates
- Removed "Attendance" from main nav
- Added "Chat" to main nav
- Added "More" menu with additional options (Settings, Attendance, Help)
- For owners: Dashboard, Events, Chat, Members, More
- For others: Dashboard, Events, Chat, More

### 5. Dashboard Updates
- **Active Notice** - Highlighted display at top of dashboard
- **Latest Posts** - Shows 3 most recent blog posts
- Both sections visible to all users

## Storage Bucket Setup

You'll need to create a Supabase storage bucket for chat attachments:

```sql
-- Create storage bucket for chat attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat-attachments', 'chat-attachments', true);

-- Set up RLS policies for chat attachments
CREATE POLICY "Users can upload chat attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-attachments');

CREATE POLICY "Users can view chat attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'chat-attachments');
```

## Realtime Setup

Ensure Realtime is enabled for the `Message` table in Supabase:

1. Go to Database > Replication in Supabase dashboard
2. Enable replication for the `Message` table
3. The chat component will automatically subscribe to changes

## Next Steps

1. Run database migrations to create new tables
2. Set up storage bucket for chat attachments
3. Enable Realtime for Message table
4. Test chat functionality
5. Create blog posts and notices via API or admin interface

## API Endpoints

### Chat
- `GET /api/chat/channels` - List channels
- `POST /api/chat/channels` - Create channel
- `GET /api/chat/messages?channelId=xxx` - Get messages
- `POST /api/chat/messages` - Send message

### Blog
- `GET /api/blog` - List posts (supports `?limit=10&type=event`)
- `POST /api/blog` - Create post (owner/coach only)

### Notices
- `GET /api/notices` - Get active notice
- `POST /api/notices` - Create notice (owner/coach only)
- `PUT /api/notices` - Update notice active status


