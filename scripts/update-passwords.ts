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

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase environment variables");
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Password mapping for non-onboarded users (all wrestler names)
const USER_PASSWORDS: Record<string, string> = {
  "2bb0fc74-0d3a-4ca1-bc56-960cce122e7c": "therock", // Fariba Akbar
  "7f7e141c-ee02-47f7-a136-8e931715a423": "johncena", // Tatiana Bell
  "f294fb66-4c84-49b0-b602-b3d1c8b82d2b": "hulkhogan", // Mitra Jabbour
  "0be52ade-8fb3-4140-a338-726a1ffcfac2": "austin", // Luke Drummond
  "c2d420f0-e398-4be9-8dab-1c4d4388cd0b": "undertaker", // Mazin Turki
  "3265fb61-ad5a-4a6c-b9ec-b6ed9b4c1535": "goldberg", // Erik Singer
};

const USER_EMAILS: Record<string, string> = {
  "2bb0fc74-0d3a-4ca1-bc56-960cce122e7c": "faribaakbar@hotmail.com",
  "7f7e141c-ee02-47f7-a136-8e931715a423": "bellfrancesca@bell.net",
  "f294fb66-4c84-49b0-b602-b3d1c8b82d2b": "girltakesflight@gmail.com",
  "0be52ade-8fb3-4140-a338-726a1ffcfac2": "lisaverdone@hotmail.com",
  "c2d420f0-e398-4be9-8dab-1c4d4388cd0b": "tslafa@hotmail.com",
  "3265fb61-ad5a-4a6c-b9ec-b6ed9b4c1535": "eriksinger2@yahoo.ca",
};

async function updatePasswords() {
  const results: Array<{ email: string; success: boolean; error?: string }> =
    [];

  console.log("Updating passwords for non-onboarded users...\n");

  // Get all users from Supabase Auth
  const { data: authUsers, error: listError } =
    await supabaseAdmin.auth.admin.listUsers();

  if (listError) {
    console.error("Error listing users:", listError);
    process.exit(1);
  }

  for (const [userId, password] of Object.entries(USER_PASSWORDS)) {
    const email = USER_EMAILS[userId];
    const authUser = authUsers.users.find((u) => u.email === email);

    if (!authUser) {
      console.log(`⚠️  User not found in Auth: ${email}`);
      // Create user if doesn't exist
      const { error: createError } =
        await supabaseAdmin.auth.admin.createUser({
          email: email,
          password: password,
          email_confirm: true,
        });

      if (createError) {
        console.error(
          `❌ Failed to create user ${email}:`,
          createError.message,
        );
        results.push({ email, success: false, error: createError.message });
      } else {
        console.log(`✅ Created and set password for: ${email} (${password})`);
        results.push({ email, success: true });
      }
    } else {
      // Update existing user's password
      const { error: updateError } =
        await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
          password: password,
        });

      if (updateError) {
        console.error(
          `❌ Failed to update password for ${email}:`,
          updateError.message,
        );
        results.push({ email, success: false, error: updateError.message });
      } else {
        console.log(`✅ Updated password for: ${email} (${password})`);
        results.push({ email, success: true });
      }
    }
  }

  console.log(`\n${"=".repeat(70)}`);
  console.log("Summary:");
  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);

  if (failCount > 0) {
    console.log("\nFailed updates:");
    results
      .filter((r) => !r.success)
      .forEach((r) => {
        console.log(`  - ${r.email}: ${r.error}`);
      });
  }
}

updatePasswords()
  .then(() => {
    console.log("\n✅ Password update complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Error updating passwords:", error);
    process.exit(1);
  });
