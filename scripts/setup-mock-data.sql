-- Setup Mock Data for TOM
-- Run this after creating auth users via create-mock-users.ts script

-- Step 1: Create gym (replace USER_ID with owner's auth user ID)
-- First, get the owner's user ID from auth.users table or use the script output
-- Then insert gym:

-- INSERT INTO "Gym" (id, name, "logoUrl", "createdById", "createdAt", "updatedAt")
-- VALUES (
--   gen_random_uuid(),
--   'Titans of Mississauga',
--   NULL,
--   'OWNER_USER_ID_HERE', -- Replace with actual owner user ID
--   NOW(),
--   NOW()
-- );

-- Step 2: Create users in User table (replace USER_IDs and GYM_ID)
-- INSERT INTO "User" (id, email, name, phone, address, role, "gymId", onboarded, "createdAt", "updatedAt")
-- VALUES
--   ('OWNER_USER_ID', 'owner@titans.com', 'Erik Singer', '4168241408', '6810 Kitimat Rd #24, Mississauga, ON, L5N 5M2', 'owner', 'GYM_ID_HERE', true, NOW(), NOW()),
--   ('COACH1_USER_ID', 'coach1@titans.com', 'Pascal Tyrrell', '9066161187', '476 Candler Road, Oakville, Ontario L6J 4X6', 'coach', 'GYM_ID_HERE', true, NOW(), NOW()),
--   ('COACH2_USER_ID', 'coach2@titans.com', 'Michael Zarich', NULL, NULL, 'coach', 'GYM_ID_HERE', true, NOW(), NOW()),
--   ('ATHLETE1_USER_ID', 'athlete1@titans.com', 'Dae Woo Kim', '4164177413', '4217 Trapper Cres, Mississauga, Ontario', 'athlete', 'GYM_ID_HERE', true, NOW(), NOW()),
--   ('ATHLETE2_USER_ID', 'athlete2@titans.com', 'Haya Jabbour', '6475022048', '6230 Kisby Dr, Mississauga, Ontario L5V 1M5', 'athlete', 'GYM_ID_HERE', true, NOW(), NOW()),
--   ('ATHLETE3_USER_ID', 'athlete3@titans.com', 'Luke Drummond', '9054661397', '6399 Spinnaker Circle #156, Mississauga, Ontario L5W 1Z6', 'athlete', 'GYM_ID_HERE', true, NOW(), NOW());

-- Step 3: Create a recurring event
-- INSERT INTO "Event" (id, "gymId", title, "recurrenceRule", "startTime", "endTime", "createdAt", "updatedAt")
-- VALUES (
--   gen_random_uuid(),
--   'GYM_ID_HERE',
--   'Morning Training Session',
--   'FREQ=WEEKLY;BYDAY=MO,WE,FR',
--   '06:00',
--   '08:00',
--   NOW(),
--   NOW()
-- );



