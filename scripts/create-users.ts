import { randomBytes } from "crypto";
import { readFileSync } from "fs";
import { createAdminClient } from "@/lib/supabase/admin";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/drizzle/schema";
import { users } from "@/drizzle/schema";

// Load .env file manually
const envFile = readFileSync(".env", "utf-8");
const envVars: Record<string, string> = {};
envFile.split("\n").forEach((line) => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    const value = match[2].trim().replace(/^["']|["']$/g, "");
    envVars[key] = value;
  }
});

// Set environment variables
Object.assign(process.env, envVars);

// Create database connection
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL must be set in .env");
}

const client = postgres(connectionString, {
  prepare: false,
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  max_lifetime: 60 * 30,
  onnotice: () => {},
  transform: {
    undefined: null,
  },
});

const db = drizzle(client, { schema });

interface UserToCreate {
  email: string;
  name: string;
  role: "owner" | "coach" | "athlete";
}

const usersToCreate: UserToCreate[] = [
  {
    email: "pascal.tyrrell@gmail.com",
    name: "Pascal Tyrrell",
    role: "owner", // Admin and Head Coach
  },
  {
    email: "sabrina@tyrrell4innovation.ca",
    name: "Sabrina",
    role: "coach", // Volunteer
  },
  {
    email: "alex@gaul.ca",
    name: "Alex Gaul",
    role: "coach", // Volunteer (father of Dennis)
  },
  {
    email: "lubikadan@hotmail.com",
    name: "Timea Dancisinova",
    role: "athlete",
  },
  {
    email: "wendysmith747@gmail.com",
    name: "Peter Smith",
    role: "athlete",
  },
  {
    email: "Abellery@wightman.ca",
    name: "Jack Ellery",
    role: "athlete",
  },
  {
    email: "claude.marquis1@outlook.com",
    name: "Lauren Maquis",
    role: "athlete",
  },
  // Note: Dennis Gaul shares email with Alex Gaul (alex@gaul.ca)
  // This will need to be handled separately - they share the same account
];

interface UserCredentials {
  email: string;
  name: string;
  role: string;
  password: string;
  userId?: string;
}

async function createUsers() {
  const supabaseAdmin = createAdminClient();
  const credentials: UserCredentials[] = [];

  console.log("Creating users...\n");

  for (const userData of usersToCreate) {
    try {
      // Generate random password (16 bytes = 32 hex characters)
      const password = randomBytes(16).toString("hex");

      // Create user in Supabase Auth
      const { data: authData, error: authError } =
        await supabaseAdmin.auth.admin.createUser({
          email: userData.email,
          password: password,
          email_confirm: true, // Auto-confirm email
          user_metadata: {
            name: userData.name,
          },
        });

      if (authError || !authData.user) {
        console.error(
          `❌ Failed to create ${userData.email}:`,
          authError?.message || "Unknown error"
        );
        continue;
      }

      // Create user record in database
      await db.insert(users).values({
        id: authData.user.id,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        onboarded: false,
      });

      credentials.push({
        email: userData.email,
        name: userData.name,
        role: userData.role,
        password: password,
        userId: authData.user.id,
      });

      console.log(`✅ Created: ${userData.name} (${userData.email})`);
    } catch (error) {
      console.error(`❌ Error creating ${userData.email}:`, error);
    }
  }

  // Handle Dennis Gaul - he shares email with Alex Gaul
  // We'll add him as a note in the credentials
  console.log(
    "\n⚠️  Note: Dennis Gaul shares email (alex@gaul.ca) with Alex Gaul"
  );

  return credentials;
}

// Run the script
createUsers()
  .then((credentials) => {
    console.log("\n" + "=".repeat(60));
    console.log("USER CREDENTIALS");
    console.log("=".repeat(60) + "\n");

    credentials.forEach((cred) => {
      console.log(`Email: ${cred.email}`);
      console.log(`Name: ${cred.name}`);
      console.log(`Role: ${cred.role}`);
      console.log(`Password: ${cred.password}`);
      console.log(`User ID: ${cred.userId}`);
      console.log("-".repeat(60));
    });

    console.log(
      "\n⚠️  IMPORTANT: Save these credentials securely. Passwords cannot be recovered!"
    );
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });

