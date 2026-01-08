import { readFileSync } from "fs";
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

async function updateJack() {
  const { data: authUsersData } = await supabaseAdmin.auth.admin.listUsers();
  const jackAuthUser = authUsersData?.users?.find((u) => u.email === "Abellery@wightman.ca");
  
  if (jackAuthUser) {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(jackAuthUser.id, {
      password: "jack123",
      email_confirm: true,
    });
    if (error) {
      console.error(`❌ Failed:`, error.message);
    } else {
      console.log(`✅ Updated Jack Ellery`);
      console.log(`   User ID: ${jackAuthUser.id}`);
      console.log(`   Password: jack123`);
    }
  } else {
    console.log(`❌ Jack Ellery not found in auth`);
  }
}

updateJack().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
