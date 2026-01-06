import { randomBytes } from "crypto";
import { createClient } from "@supabase/supabase-js";

// Load .env manually
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

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase environment variables");
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

interface UserInfo {
  email: string;
  name: string;
  role: string;
  userId: string;
}

const users: UserInfo[] = [
  {
    email: "pascal.tyrrell@gmail.com",
    name: "Pascal Tyrrell",
    role: "Admin/Head Coach",
    userId: "b866a793-d050-4440-ab01-fa76a5502249",
  },
  {
    email: "sabrina@tyrrell4innovation.ca",
    name: "Sabrina",
    role: "Volunteer",
    userId: "4edfaa2a-02c4-4ebb-b5e6-408973be66a1",
  },
  {
    email: "alex@gaul.ca",
    name: "Alex Gaul",
    role: "Volunteer",
    userId: "1dd9d2cb-54ce-4113-9d76-0776d2d4aa79",
  },
  {
    email: "lubikadan@hotmail.com",
    name: "Timea Dancisinova",
    role: "Athlete",
    userId: "a8543e21-c1fa-4f0f-ba0c-17359d866008",
  },
  {
    email: "wendysmith747@gmail.com",
    name: "Peter Smith",
    role: "Athlete",
    userId: "ae15e708-9aeb-4215-92f8-25af062f4b55",
  },
  {
    email: "Abellery@wightman.ca",
    name: "Jack Ellery",
    role: "Athlete",
    userId: "09c69b09-1b66-47dc-9393-32c436f4c734",
  },
  {
    email: "claude.marquis1@outlook.com",
    name: "Lauren Maquis",
    role: "Athlete",
    userId: "c9c4542e-ad41-40d1-a24c-50b51e84c9de",
  },
];

async function generatePasswords() {
  const credentials: Array<{
    email: string;
    name: string;
    role: string;
    password: string;
    userId: string;
  }> = [];

  for (const user of users) {
    // Generate random password (16 bytes = 32 hex characters)
    const password = randomBytes(16).toString("hex");

    try {
      // Update user password in Supabase Auth
      const { error } = await supabaseAdmin.auth.admin.updateUserById(
        user.userId,
        {
          password: password,
          email_confirm: true,
        }
      );

      if (error) {
        console.error(`❌ Failed to set password for ${user.email}:`, error.message);
        continue;
      }

      credentials.push({
        email: user.email,
        name: user.name,
        role: user.role,
        password: password,
        userId: user.userId,
      });

      console.log(`✅ Password set for: ${user.name} (${user.email})`);
    } catch (error) {
      console.error(`❌ Error setting password for ${user.email}:`, error);
    }
  }

  return credentials;
}

generatePasswords()
  .then((credentials) => {
    console.log("\n" + "=".repeat(70));
    console.log("USER CREDENTIALS - SOMAS PLATFORM");
    console.log("=".repeat(70) + "\n");

    credentials.forEach((cred, index) => {
      console.log(`${index + 1}. ${cred.name}`);
      console.log(`   Email: ${cred.email}`);
      console.log(`   Role: ${cred.role}`);
      console.log(`   Password: ${cred.password}`);
      console.log(`   User ID: ${cred.userId}`);
      console.log("");
    });

    console.log("=".repeat(70));
    console.log("⚠️  IMPORTANT: Save these credentials securely!");
    console.log("⚠️  Passwords cannot be recovered - store them safely.");
    console.log("=".repeat(70));

    // Also write to markdown file
    const fs = require("fs");
    let markdown = `# SOMAS Platform - User Credentials\n\n`;
    markdown += `Generated: ${new Date().toISOString()}\n\n`;
    markdown += `---\n\n`;

    credentials.forEach((cred, index) => {
      markdown += `## ${index + 1}. ${cred.name}\n\n`;
      markdown += `- **Email:** \`${cred.email}\`\n`;
      markdown += `- **Role:** ${cred.role}\n`;
      markdown += `- **Password:** \`${cred.password}\`\n`;
      markdown += `- **User ID:** \`${cred.userId}\`\n\n`;
    });

    markdown += `---\n\n`;
    markdown += `## Notes\n\n`;
    markdown += `- **Dennis Gaul** shares the email account with **Alex Gaul** (\`alex@gaul.ca\`)\n`;
    markdown += `- All passwords are randomly generated 32-character hex strings\n`;
    markdown += `- Users must complete profile setup on first login\n`;
    markdown += `- Passwords can be changed by users after login\n\n`;

    fs.writeFileSync("USER_CREDENTIALS.md", markdown);
    console.log("\n✅ Credentials saved to USER_CREDENTIALS.md");

    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });

