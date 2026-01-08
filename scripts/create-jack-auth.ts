import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

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

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function createJack() {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: "Abellery@wightman.ca",
    password: "jack123",
    email_confirm: true,
    user_metadata: { name: "Jack Ellery" },
  });

  if (error) {
    console.error("❌ Failed:", error.message);
  } else if (data.user) {
    console.log("✅ Created Jack Ellery in auth");
    console.log(`   User ID: ${data.user.id}`);
    console.log("   Password: jack123");
    console.log(`\nUpdate database User table with ID: ${data.user.id}`);
  }
}

createJack()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
