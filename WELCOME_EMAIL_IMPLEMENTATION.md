# Welcome Email & Onboarding Implementation Plan

## Overview

This document outlines the complete implementation for importing users, sending welcome emails, and allowing users to set up their passwords and complete onboarding.

## Architecture

### Flow Diagram

```
1. Admin imports users (CSV/JSON)
   ↓
2. System creates users in Supabase Auth with random passwords
   ↓
3. System creates user records in database with pre-filled info
   ↓
4. Welcome email sent with password setup link
   ↓
5. User clicks link → Password setup page
   ↓
6. User sets password → Redirected to onboarding
   ↓
7. User completes profile → Dashboard
```

## Components Created/Modified

### 1. Email Template
**File:** `emails/welcome.tsx`
- Beautiful welcome email using React Email
- Includes gym branding (logo, name)
- Prominent "Set Up Your Account" button
- Mobile-responsive design
- Uses existing `BaseLayout` component

### 2. Admin Supabase Client
**File:** `lib/supabase/admin.ts`
- Server-side admin client for elevated permissions
- Used to create users and generate password reset tokens
- Requires `SUPABASE_SERVICE_ROLE_KEY` environment variable

### 3. Updated Roster Import Route
**File:** `app/api/roster/import/route.ts`
- **Changes:**
  - Creates users directly in Supabase Auth (instead of invitations)
  - Generates random 32-character passwords
  - Auto-confirms email addresses
  - Creates database records with pre-filled information
  - Sends welcome emails with password setup links
  - Supports CSV/JSON import with flexible column names

**Import Format:**
```csv
email,name,phone,address,role
user@example.com,John Doe,555-1234,123 Main St,athlete
```

### 4. Password Setup Page
**File:** `app/(auth)/setup-password/page.tsx`
- Mobile and desktop friendly
- Password validation (min 8 characters)
- Password confirmation
- Uses Supabase recovery token flow
- Redirects to onboarding after success

**URL Format:**
```
/setup-password?token=<recovery_token>&email=<user_email>
```

### 5. Updated Onboarding Page
**File:** `app/(dashboard)/onboarding/page.tsx`
- Mobile-responsive design
- Pre-populates fields from imported data
- Allows users to edit pre-filled information
- Profile photo upload
- Name, phone, address fields
- Redirects to dashboard after completion

### 6. Welcome Email Script
**File:** `scripts/send-welcome-emails.ts`
- Sends welcome emails to all users who haven't completed onboarding
- Can filter by gym ID
- Generates fresh password setup links
- Error handling and logging

**Usage:**
```bash
# Send to all users
npx tsx scripts/send-welcome-emails.ts

# Send to specific gym
npx tsx scripts/send-welcome-emails.ts --gym-id <gym-id>
```

## Environment Variables Required

Add these to your `.env` file:

```env
# Supabase Admin (for creating users)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Email (already configured)
RESEND_API_KEY=your_resend_key
RESEND_FROM_NAME=Titans of Mississauga
RESEND_FROM_EMAIL=noreply@mail.titansofmississauga.ca
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

## Database Schema

No schema changes required. Uses existing:
- `User` table (with `onboarded` boolean field)
- `Gym` table (for gym info in emails)

## User Flow

### For Imported Users:

1. **Admin imports roster** via `/roster` page
   - Uploads CSV/JSON file
   - System creates users with random passwords
   - Welcome emails sent automatically

2. **User receives email**
   - Clicks "Set Up Your Account" button
   - Redirected to `/setup-password`

3. **User sets password**
   - Enters new password (min 8 chars)
   - Confirms password
   - Redirected to `/onboarding`

4. **User completes profile**
   - Reviews/edits pre-filled information
   - Uploads profile photo (optional)
   - Clicks "Complete Profile"
   - Redirected to `/dashboard`

### For Manually Invited Users:

Existing invitation flow still works:
- Invitation email sent
- User registers with token
- Completes profile setup

## Security Considerations

1. **Random Passwords:** Generated using `crypto.randomBytes(16)` - cryptographically secure
2. **Password Reset Tokens:** Generated via Supabase Admin API, expire after 7 days
3. **Email Confirmation:** Auto-confirmed for imported users (since admin is importing)
4. **Admin Access:** Service role key only used server-side, never exposed to client

## Mobile Responsiveness

All pages are mobile-friendly:
- Responsive card layouts
- Touch-friendly form inputs
- Mobile-optimized email templates
- Proper viewport handling

## Testing Checklist

- [ ] Import users via CSV
- [ ] Verify welcome emails are sent
- [ ] Test password setup flow
- [ ] Test onboarding page with pre-filled data
- [ ] Test mobile responsiveness
- [ ] Test error handling (invalid tokens, expired links)
- [ ] Test welcome email script
- [ ] Verify users can edit pre-filled information
- [ ] Test profile photo upload

## API Endpoints

### POST `/api/roster/import`
- **Auth:** Required (owner role)
- **Body:** FormData with CSV/JSON file
- **Response:** `{ success: true, created: number, errors: number }`

### POST `/api/profile-setup`
- **Auth:** Required
- **Body:** `{ name, phone?, address?, avatarUrl? }`
- **Response:** `{ success: true }`

## Email Templates

### Welcome Email
- **Subject:** "Welcome to {gymName}!"
- **Template:** `emails/welcome.tsx`
- **Includes:** Gym branding, welcome message, setup button

## Future Enhancements

1. **Bulk Operations:** Add ability to resend welcome emails from admin panel
2. **Email Templates:** Allow gyms to customize welcome email content
3. **Onboarding Steps:** Multi-step onboarding with progress indicator
4. **Password Strength:** Add password strength meter
5. **Account Recovery:** Enhanced password recovery flow

## Troubleshooting

### Users not receiving emails
- Check Resend API key
- Verify email addresses are valid
- Check spam folders
- Review Resend dashboard for delivery status

### Password setup link not working
- Verify token hasn't expired (7 days)
- Check `NEXT_PUBLIC_APP_URL` is correct
- Ensure Supabase service role key is set

### Import errors
- Check CSV/JSON format
- Verify required columns (email)
- Check for duplicate emails
- Review server logs for detailed errors

## Support

For issues or questions:
1. Check server logs for detailed error messages
2. Verify all environment variables are set
3. Test with a single user first before bulk import
4. Review Supabase Auth logs in dashboard
