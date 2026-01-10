import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const _ENV_LINE_REGEX = /^([^#=]+)=(.*)$/;
const QUOTE_REGEX = /^["']|["']$/g;
const ENV_VALUE_REGEX = /^([^#=]+)=(.*)$/;

const envFile = readFileSync(".env", "utf-8");
const envVars: Record<string, string> = {};
for (const line of envFile.split("\n")) {
  const match = line.match(ENV_VALUE_REGEX);
  if (match) {
    const key = match[1].trim();
    const value = match[2].trim().replace(QUOTE_REGEX, "");
    envVars[key] = value;
  }
}

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function updateAli() {
  const { data: authUsersData } = await supabaseAdmin.auth.admin.listUsers();
  const aliAuthUser = authUsersData?.users?.find(
    (u) => u.email === "ali@softxinnovations.ca"
  );

  if (aliAuthUser) {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(
      aliAuthUser.id,
      {
        password: "ali123",
        email_confirm: true,
      }
    );
    if (error) {
      console.error("❌ Failed:", error.message);
    } else {
      console.log("✅ Updated Ali");
      console.log(`   User ID: ${aliAuthUser.id}`);
      console.log("   Email: ali@softxinnovations.ca");
      console.log("   Password: ali123");
    }
  } else {
    console.log("❌ Ali not found in auth");
  }
}

updateAli()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
