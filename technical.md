# TOM — Technical Specification Document

## 1. System Architecture Overview

TOM uses a hybrid architecture:

- **Mobile App** — athlete-facing (separate project)
- **Web App** — admin + coach dashboard
- **Backend Services** — authentication, database, realtime, storage
- **API Routes + Edge Functions** — business logic

### Architecture Diagram (Text Version)

```
Web App/
  app/
  api/ (API routes)

Mobile App/ (separate project)
  app/
  components/
  utils/

Database — relational database with row-level security
Auth — authentication service
Storage — file storage service
Notifications — push notifications + email
Realtime — realtime updates for chat & RSVPs
```

---

## 2. User Roles

### Gym Owner
- Creates gym
- Uploads logo
- Manages members
- Sends invitations
- Creates recurring events
- Cancels sessions
- Views attendance analytics
- Sends announcements

### Coach
- Sees upcoming events
- Tracks RSVPs
- Gets notified when someone cancels
- Posts announcements

### Athlete
- RSVPs to next event
- Gets notifications
- Uses chat (global, group, DM)
- Edits profile + notification preferences

---

## 3. Authentication & Onboarding Flow

- Only **Gym Owner** can create a gym.
- Owner invites users with auto-generated signup links.
- User clicks link → redirected to authentication service → signs up.
- On completion, user is linked to the gym automatically.
- Password reset supported by authentication service.

---

## 4. Event & Recurrence Engine

Each gym can define recurring events:

- Weekly (e.g., Every Thursday 7pm)
- Daily
- Monthly
- Custom rules (stored as recurrence rule strings)

### Event Lifecycle
1. Owner/coach creates event
2. Recurrence expands into future occurrences
3. Athletes RSVP
4. System sends:
   - confirmation
   - reminders (2 hours before)
   - cancellation alerts
5. Attendance logged after event passes

### Calendar Sync
Implemented with calendar service integration (server-side):

- Store refresh token securely
- Push updates to athlete calendars
- Remove canceled events

---

## 5. Chat System

### Channels
- Global gym channel
- Direct messages between any two users
- User-created group chats

### Backend
- Realtime service listens on `messages` table
- Row-level security ensures users can only read messages from their gym

### Attachments
- Uploaded to file storage service
- Message row stores file URL

---

## 6. Database Schema (Simplified)

### gyms
- id (uuid)
- name (text)
- logo_url (text)
- created_at

### users
- id (uuid)
- email
- name
- phone
- role (enum: athlete, coach, owner)
- gym_id (uuid)
- push_token
- notif_preferences (jsonb)

### events
- id
- gym_id
- title
- recurrence_rule (text)
- start_time
- end_time

### event_occurrences
- id
- event_id
- date
- status (scheduled, canceled)

### rsvps
- id
- user_id
- occurrence_id
- status (going, not_going)

### announcements
- id
- gym_id
- coach_id
- content
- created_at

### messages
- id
- gym_id
- sender_id
- channel_id
- content
- created_at

### channels
- id
- gym_id
- name
- type (global, dm, group)

---

## 7. Realtime Logic

### RSVP Realtime
- Coaches notified instantly when someone RSVPs or cancels.

### Chat Realtime
- Powered by realtime service
- Client subscribes to channel events
- Delivered instantly to mobile + web

---

## 8. Notifications System

### Types
- Push notifications
- Email notifications
- In-app notifications

### Triggers
- RSVP changes
- Session reminders
- Cancellations
- Coach announcements
- Chat mentions (@username)

### Delivery
Handled by:
- API endpoints (fan‑out notifications)
- Scheduled functions (scheduled reminders)

---

## 9. Project Structure

### Web App
- Standalone web application
- Contains admin and coach dashboard
- API routes for server-side logic
- Edge functions for scheduled tasks

### Mobile App
- Separate mobile project
- Athlete-facing mobile application
- Independent codebase, shares backend services

---

## 10. Feature Roadmap

### Phase 1 (MVP)
- Gym creation
- User invites
- RSVP system
- Global chat
- Announcements
- Push notifications

### Phase 2
- Group chats
- Coach dashboard analytics
- Calendar sync
- Attendance history

---

End of technical specification.
