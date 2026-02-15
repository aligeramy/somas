import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { gyms, users } from "@/drizzle/schema";

const ENV_LINE_REGEX = /^([^#=]+)=(.*)$/;
const QUOTE_TRIM_REGEX = /^["']|["']$/g;

// Load .env manually
const envFile = readFileSync(".env", "utf-8");
const envVars: Record<string, string> = {};
for (const line of envFile.split("\n")) {
  const match = line.match(ENV_LINE_REGEX);
  if (match) {
    const key = match[1].trim();
    const value = match[2].trim().replace(QUOTE_TRIM_REGEX, "");
    envVars[key] = value;
  }
}

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;
const databaseUrl = envVars.DATABASE_URL;

if (!(supabaseUrl && supabaseServiceKey && databaseUrl)) {
  throw new Error("Missing environment variables");
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const client = postgres(databaseUrl, {
  prepare: false,
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  max_lifetime: 60 * 30,
  onnotice: () => {
    /* suppress postgres notices */
  },
  transform: {
    undefined: null,
  },
});

const db = drizzle(client, { schema: { gyms, users } });

async function createAliAdmin() {
  const email = "ali@softxinnovations.ca";
  const name = "Alireza";
  const password = "Alireza11!";
  const role = "owner";

  try {
    // Check if user already exists in database
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    // Create user in Supabase Auth using Admin API
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          name,
        },
      });

    if (authError || !authData.user) {
      console.error(
        "❌ Failed to create auth user:",
        authError?.message || "Unknown error"
      );
      process.exit(1);
    }

    // Get gym ID
    const [gym] = await db.select().from(gyms).limit(1);

    // Create or update user in database
    if (existingUser) {
      await db
        .update(users)
        .set({
          id: authData.user.id,
          name,
          role: role as "owner" | "coach" | "athlete" | "manager",
          gymId: gym?.id || existingUser.gymId || null,
          onboarded: true,
          updatedAt: new Date(),
        })
        .where(eq(users.email, email));
      console.log(`✅ Updated existing user: ${name} (${email})`);
    } else {
      await db.insert(users).values({
        id: authData.user.id,
        email,
        name,
        role: role as "owner" | "coach" | "athlete" | "manager",
        gymId: gym?.id || null,
        onboarded: true,
      });
      console.log(`✅ Created new user: ${name} (${email})`);
    }

    console.log(`\nUser ID: ${authData.user.id}`);
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log(`Role: ${role}`);
    console.log(`Gym: ${gym?.name || "None"}`);

    process.exit(0);
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  }
}

createAliAdmin();
