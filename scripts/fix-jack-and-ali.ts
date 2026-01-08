import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

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

if (!(supabaseUrl && supabaseServiceKey)) {
  throw new Error("Missing Supabase environment variables");
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function fixUsers() {
  // Fix Jack Ellery password
  const { data: authUsersData } = await supabaseAdmin.auth.admin.listUsers();
  const authUsers = authUsersData?.users || [];

  const jackAuthUser = authUsers.find(
    (u) => u.email === "Abellery@wightman.ca"
  );
  if (jackAuthUser) {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(
      jackAuthUser.id,
      {
        password: "jack123",
        email_confirm: true,
      }
    );
    if (error) {
      console.error("❌ Failed to update Jack:", error.message);
    } else {
      console.log("✅ Updated Jack Ellery password: jack123");
      console.log(`   User ID: ${jackAuthUser.id}`);
    }
  }

  // Check ali
  const aliAuthUser = authUsers.find(
    (u) => u.email === "ali@softxinnovations.ca"
  );
  if (aliAuthUser) {
    console.log(`✅ Ali user exists in auth: ${aliAuthUser.id}`);
  } else {
    console.log("❌ Ali user not found in auth");
  }

  console.log("\nUSER_PASSWORDS mapping:\n");
  console.log("const USER_PASSWORDS: Record<string, string> = {");
  console.log(
    '  "b866a793-d050-4440-ab01-fa76a5502249": "admin123", // Pascal Tyrrell'
  );
  console.log(
    '  "4edfaa2a-02c4-4ebb-b5e6-408973be66a1": "coach123", // Sabrina'
  );
  console.log(
    '  "1dd9d2cb-54ce-4113-9d76-0776d2d4aa79": "volunteer123", // Alex Gaul'
  );
  console.log(
    '  "a8543e21-c1fa-4f0f-ba0c-17359d866008": "athlete123", // Timea Dancisinova'
  );
  console.log(
    '  "ae15e708-9aeb-4215-92f8-25af062f4b55": "peter123", // Peter Smith'
  );
  if (jackAuthUser) {
    console.log(`  "${jackAuthUser.id}": "jack123", // Jack Ellery`);
  }
  console.log(
    '  "c9c4542e-ad41-40d1-a24c-50b51e84c9de": "lauren123", // Lauren Maquis'
  );
  if (aliAuthUser) {
    console.log(`  "${aliAuthUser.id}": "ali123", // Ali`);
  }
  console.log("};");
}

fixUsers()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
