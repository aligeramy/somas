import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

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

async function listUsers() {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers();
  if (error) {
    console.error("Error:", error);
    return;
  }

  console.log("All auth users:\n");
  data.users.forEach((u) => {
    console.log(`${u.email} - ID: ${u.id}`);
  });

  const jack = data.users.find(
    (u) => u.email.toLowerCase() === "Abellery@wightman.ca".toLowerCase()
  );
  if (jack) {
    console.log(`\n✅ Found Jack: ${jack.id}`);
    const { error: updateError } =
      await supabaseAdmin.auth.admin.updateUserById(jack.id, {
        password: "jack123",
        email_confirm: true,
      });
    if (updateError) {
      console.error("❌ Failed to update:", updateError.message);
    } else {
      console.log(`✅ Updated Jack's password to: jack123`);
    }
  } else {
    console.log("\n❌ Jack not found");
  }
}

listUsers()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
