import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

interface MockUser {
  email: string;
  password: string;
  name: string;
  role: "owner" | "coach" | "athlete";
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
  console.log("Creating mock users via Supabase Auth API...\n");

  const createdUsers: Array<{ email: string; password: string; name: string; role: string; userId: string }> = [];

  for (const userData of mockUsers) {
    try {
      // Check if user exists
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existing = existingUsers.users.find((u) => u.email === userData.email);

      if (existing) {
        console.log(`✓ User ${userData.email} already exists (ID: ${existing.id})`);
        createdUsers.push({
          email: userData.email,
          password: userData.password,
          name: userData.name,
          role: userData.role,
          userId: existing.id,
        });
        continue;
      }

      // Create user in Supabase Auth
      const { data: authData, error } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true,
      });

      if (error) {
        console.error(`✗ Error creating ${userData.email}:`, error.message);
        continue;
      }

      console.log(`✓ Created ${userData.role}: ${userData.name} (${userData.email})`);
      createdUsers.push({
        email: userData.email,
        password: userData.password,
        name: userData.name,
        role: userData.role,
        userId: authData.user.id,
      });
    } catch (error) {
      console.error(`✗ Error processing ${userData.email}:`, error);
    }
  }

  console.log(`\n✅ Created ${createdUsers.length} users`);
  console.log("\nNext step: Run SQL script to create database records and gym");
  console.log("See MOCK_DATA.md for login credentials");
}

main().catch(console.error);



