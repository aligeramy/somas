import { readFileSync } from "fs";
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

// User passwords mapping - simple phrases
const USER_PASSWORDS: Record<string, { email: string; name: string; password: string; role: string; userId: string }> = {
  "b866a793-d050-4440-ab01-fa76a5502249": {
    email: "pascal.tyrrell@gmail.com",
    name: "Pascal Tyrrell",
    password: "admin123",
    role: "owner",
    userId: "b866a793-d050-4440-ab01-fa76a5502249",
  },
  "4edfaa2a-02c4-4ebb-b5e6-408973be66a1": {
    email: "sabrina@tyrrell4innovation.ca",
    name: "Sabrina",
    password: "coach123",
    role: "coach",
    userId: "4edfaa2a-02c4-4ebb-b5e6-408973be66a1",
  },
  "1dd9d2cb-54ce-4113-9d76-0776d2d4aa79": {
    email: "alex@gaul.ca",
    name: "Alex Gaul",
    password: "volunteer123",
    role: "coach",
    userId: "1dd9d2cb-54ce-4113-9d76-0776d2d4aa79",
  },
  "a8543e21-c1fa-4f0f-ba0c-17359d866008": {
    email: "lubikadan@hotmail.com",
    name: "Timea Dancisinova",
    password: "athlete123",
    role: "athlete",
    userId: "a8543e21-c1fa-4f0f-ba0c-17359d866008",
  },
  "ae15e708-9aeb-4215-92f8-25af062f4b55": {
    email: "wendysmith747@gmail.com",
    name: "Peter Smith",
    password: "peter123",
    role: "athlete",
    userId: "ae15e708-9aeb-4215-92f8-25af062f4b55",
  },
  "09c69b09-1b66-47dc-9393-32c436f4c734": {
    email: "Abellery@wightman.ca",
    name: "Jack Ellery",
    password: "jack123",
    role: "athlete",
    userId: "09c69b09-1b66-47dc-9393-32c436f4c734",
  },
  "c9c4542e-ad41-40d1-a24c-50b51e84c9de": {
    email: "claude.marquis1@outlook.com",
    name: "Lauren Maquis",
    password: "lauren123",
    role: "athlete",
    userId: "c9c4542e-ad41-40d1-a24c-50b51e84c9de",
  },
};

async function setupUsers() {
  const results: Array<{ email: string; success: boolean; error?: string; password: string; userId?: string }> = [];

  console.log("Setting up users and passwords...\n");

  // First, get all auth users
  const { data: authUsersData } = await supabaseAdmin.auth.admin.listUsers();
  const authUsers = authUsersData?.users || [];

  // Update existing users
  for (const [userId, userData] of Object.entries(USER_PASSWORDS)) {
    try {
      const authUser = authUsers.find((u) => u.email === userData.email);

      if (!authUser) {
        // Create user in auth
        const { data: newAuthUser, error: createError } =
          await supabaseAdmin.auth.admin.createUser({
            email: userData.email,
            password: userData.password,
            email_confirm: true,
            user_metadata: { name: userData.name },
          });

        if (createError || !newAuthUser.user) {
          console.error(`❌ Failed to create ${userData.email}:`, createError?.message);
          results.push({
            email: userData.email,
            success: false,
            error: createError?.message || "Failed to create",
            password: userData.password,
          });
          continue;
        }

        console.log(`✅ Created: ${userData.name} (${userData.email}) - Password: ${userData.password}`);
        results.push({
          email: userData.email,
          success: true,
          password: userData.password,
          userId: newAuthUser.user.id,
        });
      } else {
        // Update password
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          authUser.id,
          {
            password: userData.password,
            email_confirm: true,
          }
        );

        if (updateError) {
          console.error(`❌ Failed to update ${userData.email}:`, updateError.message);
          results.push({
            email: userData.email,
            success: false,
            error: updateError.message,
            password: userData.password,
          });
        } else {
          console.log(`✅ Updated: ${userData.name} (${userData.email}) - Password: ${userData.password}`);
          results.push({
            email: userData.email,
            success: true,
            password: userData.password,
            userId: authUser.id,
          });
        }
      }
    } catch (error) {
      console.error(`❌ Error with ${userData.email}:`, error);
      results.push({
        email: userData.email,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        password: userData.password,
      });
    }
  }

  // Create ali@softxinnovations.ca
  const aliEmail = "ali@softxinnovations.ca";
  const aliPassword = "ali123";
  const aliName = "Ali";

  try {
    const existingAli = authUsers.find((u) => u.email === aliEmail);

    if (!existingAli) {
      // Get gym ID from first owner
      const pascalUser = Object.values(USER_PASSWORDS).find((u) => u.role === "owner");
      
      const { data: aliAuthUser, error: aliCreateError } =
        await supabaseAdmin.auth.admin.createUser({
          email: aliEmail,
          password: aliPassword,
          email_confirm: true,
          user_metadata: { name: aliName },
        });

      if (aliCreateError || !aliAuthUser.user) {
        console.error(`❌ Failed to create ${aliEmail}:`, aliCreateError?.message);
      } else {
        console.log(`✅ Created: ${aliName} (${aliEmail}) - Password: ${aliPassword}`);
        console.log(`   User ID: ${aliAuthUser.user.id}`);
        results.push({
          email: aliEmail,
          success: true,
          password: aliPassword,
          userId: aliAuthUser.user.id,
        });
      }
    } else {
      // Update existing
      const { error: aliUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
        existingAli.id,
        {
          password: aliPassword,
          email_confirm: true,
        }
      );

      if (aliUpdateError) {
        console.error(`❌ Failed to update ${aliEmail}:`, aliUpdateError.message);
        results.push({
          email: aliEmail,
          success: false,
          error: aliUpdateError.message,
          password: aliPassword,
        });
      } else {
        console.log(`✅ Updated: ${aliName} (${aliEmail}) - Password: ${aliPassword}`);
        results.push({
          email: aliEmail,
          success: true,
          password: aliPassword,
          userId: existingAli.id,
        });
      }
    }
  } catch (error) {
    console.error(`❌ Error with ${aliEmail}:`, error);
    results.push({
      email: aliEmail,
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      password: aliPassword,
    });
  }

  return results;
}

setupUsers()
  .then((results) => {
    console.log("\n" + "=".repeat(70));
    console.log("USER CREDENTIALS SUMMARY");
    console.log("=".repeat(70) + "\n");

    results.forEach((result) => {
      console.log(`${result.success ? "✅" : "❌"} ${result.email}`);
      console.log(`   Password: ${result.password}`);
      if (result.userId) {
        console.log(`   User ID: ${result.userId}`);
      }
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
      console.log("");
    });

    console.log("=".repeat(70));
    console.log("\nUSER_PASSWORDS mapping for route file:\n");
    console.log("const USER_PASSWORDS: Record<string, string> = {");
    results.forEach((result) => {
      if (result.success && result.userId) {
        const userData = Object.values(USER_PASSWORDS).find((u) => u.email === result.email);
        const name = userData?.name || result.email.split("@")[0];
        console.log(`  "${result.userId}": "${result.password}", // ${name}`);
      }
    });
    // Add ali if created
    const aliResult = results.find((r) => r.email === "ali@softxinnovations.ca" && r.success);
    if (aliResult && aliResult.userId) {
      console.log(`  "${aliResult.userId}": "${aliResult.password}", // Ali`);
    }
    console.log("};");

    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
