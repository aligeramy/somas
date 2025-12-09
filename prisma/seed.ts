import { PrismaClient, UserRole } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

// Use DIRECT_URL for seed script (direct connection, not pooled)
// Parse connection string to extract SSL settings
const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL!;
const url = new URL(connectionString.replace(/^postgresql:\/\//, "https://"));
const sslMode = url.searchParams.get("sslmode") || "require";

const pool = new Pool({
  connectionString,
  ssl: sslMode === "require" || sslMode === "prefer" ? {
    rejectUnauthorized: false,
  } : false,
});
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

interface MockUser {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  phone?: string;
  address?: string;
}

const mockUsers: MockUser[] = [
  {
    email: "owner@titans.com",
    password: "Titans2024!",
    name: "Erik Singer",
    role: "owner",
    phone: "4168241408",
    address: "6810 Kitimat Rd #24, Mississauga, ON, L5N 5M2",
  },
  {
    email: "coach1@titans.com",
    password: "Coach123!",
    name: "Pascal Tyrrell",
    role: "coach",
    phone: "9066161187",
    address: "476 Candler Road, Oakville, Ontario L6J 4X6",
  },
  {
    email: "coach2@titans.com",
    password: "Coach123!",
    name: "Michael Zarich",
    role: "coach",
  },
  {
    email: "athlete1@titans.com",
    password: "Athlete123!",
    name: "Dae Woo Kim",
    role: "athlete",
    phone: "4164177413",
    address: "4217 Trapper Cres, Mississauga, Ontario",
  },
  {
    email: "athlete2@titans.com",
    password: "Athlete123!",
    name: "Haya Jabbour",
    role: "athlete",
    phone: "6475022048",
    address: "6230 Kisby Dr, Mississauga, Ontario L5V 1M5",
  },
  {
    email: "athlete3@titans.com",
    password: "Athlete123!",
    name: "Luke Drummond",
    role: "athlete",
    phone: "9054661397",
    address: "6399 Spinnaker Circle #156, Mississauga, Ontario L5W 1Z6",
  },
];

async function main() {
  console.log("Starting seed...");

  // Create gym owner first
  const owner = mockUsers.find((u) => u.role === "owner")!;

  // Check if user already exists in database
  let existingOwner = await prisma.user.findUnique({
    where: { email: owner.email },
  });

  let authUser;
  if (existingOwner) {
    console.log(`User ${owner.email} already exists, using existing user`);
    // Get auth user by email
    const { data: users } = await supabase.auth.admin.listUsers();
    const foundUser = users.users.find((u) => u.email === owner.email);
    if (!foundUser) {
      throw new Error(`User ${owner.email} exists in DB but not in Auth`);
    }
    authUser = { user: foundUser };
  } else {
    // Create user in Supabase Auth
    const { data: newAuthUser, error: authError } = await supabase.auth.admin.createUser({
      email: owner.email,
      password: owner.password,
      email_confirm: true,
    });

    if (authError) {
      console.error("Error creating auth user:", authError);
      throw authError;
    }

    authUser = newAuthUser;
    console.log(`Created auth user: ${owner.email}`);
  }

  // Check if gym already exists
  let gym = await prisma.gym.findUnique({
    where: { createdById: authUser.user.id },
  });

  if (!gym) {
    // Create gym
    gym = await prisma.gym.create({
      data: {
        name: "Titans of Mississauga",
        logoUrl: null,
        createdById: authUser.user.id,
      },
    });

    console.log(`Created gym: ${gym.name} (${gym.id})`);
  } else {
    console.log(`Gym already exists: ${gym.name} (${gym.id})`);
  }

  // Create or update owner in database
  if (!existingOwner) {
    await prisma.user.create({
      data: {
        id: authUser.user.id,
        email: owner.email,
        name: owner.name,
        phone: owner.phone,
        address: owner.address,
        role: owner.role,
        gymId: gym.id,
        onboarded: true,
      },
    });

    console.log(`Created owner: ${owner.name}`);
  } else {
    console.log(`Owner already exists: ${owner.name}`);
  }

  // Create other users
  for (const userData of mockUsers.slice(1)) {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: userData.email },
    });

    if (existingUser) {
      console.log(`${userData.role} ${userData.name} already exists, skipping`);
      continue;
    }

    // Create in Supabase Auth
    const { data: authData, error } = await supabase.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: true,
    });

    if (error) {
      console.error(`Error creating ${userData.email}:`, error.message);
      continue;
    }

    // Create in database
    await prisma.user.create({
      data: {
        id: authData.user.id,
        email: userData.email,
        name: userData.name,
        phone: userData.phone,
        address: userData.address,
        role: userData.role,
        gymId: gym.id,
        onboarded: userData.role === "coach" || userData.role === "athlete",
      },
    });

    console.log(`Created ${userData.role}: ${userData.name}`);
  }

  // Create a recurring event
  const event = await prisma.event.create({
    data: {
      gymId: gym.id,
      title: "Morning Training Session",
      recurrenceRule: "FREQ=WEEKLY;BYDAY=MO,WE,FR",
      startTime: "06:00",
      endTime: "08:00",
    },
  });

  console.log(`Created event: ${event.title}`);

  // Generate occurrences for next 2 weeks
  const occurrences = [];
  const now = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 14);

  let currentDate = new Date(now);
  // Find next Monday
  const daysUntilMonday = (1 - currentDate.getDay() + 7) % 7;
  if (daysUntilMonday === 0 && currentDate.getHours() >= 6) {
    currentDate.setDate(currentDate.getDate() + 7);
  } else {
    currentDate.setDate(currentDate.getDate() + daysUntilMonday);
  }

  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5) {
      // Monday, Wednesday, Friday
      const [hours, minutes] = event.startTime.split(":").map(Number);
      const occurrenceDate = new Date(currentDate);
      occurrenceDate.setHours(hours, minutes, 0, 0);

      if (occurrenceDate >= now) {
        occurrences.push({
          eventId: event.id,
          date: occurrenceDate,
          status: "scheduled" as const,
        });
      }
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  if (occurrences.length > 0) {
    await prisma.eventOccurrence.createMany({
      data: occurrences,
    });
    console.log(`Created ${occurrences.length} event occurrences`);
  }

  console.log("Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

