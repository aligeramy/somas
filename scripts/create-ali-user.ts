import { createClient } from "@supabase/supabase-js";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { readFileSync } from "fs";
import postgres from "postgres";
import * as schema from "@/drizzle/schema";
import { users } from "@/drizzle/schema";

// Load .env manually
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
  onnotice: () => {},
  transform: {
    undefined: null,
  },
});

const db = drizzle(client, { schema });

async function createAliUser() {
  const email = "ali@softxinnovations.ca";
  const name = "Ali";
  const password = "ali123";
  const role = "owner"; // Assuming owner role

  try {
    // Check if user already exists in database
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    // Create user in Supabase Auth
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

    // Create or update user in database
    if (existingUser) {
      await db
        .update(users)
        .set({
          id: authData.user.id,
          name,
          role: role as "owner" | "coach" | "athlete",
          updatedAt: new Date(),
        })
        .where(eq(users.email, email));
      console.log(`✅ Updated existing user: ${name} (${email})`);
    } else {
      // Get gym ID from first owner user
      const [firstOwner] = await db
        .select()
        .from(users)
        .where(eq(users.role, "owner"))
        .limit(1);

      await db.insert(users).values({
        id: authData.user.id,
        email,
        name,
        role: role as "owner" | "coach" | "athlete",
        gymId: firstOwner?.gymId || null,
        onboarded: false,
      });
      console.log(`✅ Created new user: ${name} (${email})`);
    }

    console.log(`\nUser ID: ${authData.user.id}`);
    console.log(`Password: ${password}`);
    console.log("\nAdd this to USER_PASSWORDS mapping:");
    console.log(`  "${authData.user.id}": "${password}", // ${name}`);

    process.exit(0);
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  }
}

createAliUser();
