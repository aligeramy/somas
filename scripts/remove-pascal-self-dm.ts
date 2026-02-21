import { readFileSync } from "node:fs";
import { and, eq, inArray, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/drizzle/schema";
import { channels, messages, users } from "@/drizzle/schema";

// Load .env file manually
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

// Set environment variables
Object.assign(process.env, envVars);

// Create database connection
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL must be set in .env");
}

const client = postgres(connectionString, {
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

async function removePascalSelfDM() {
  try {
    console.log("Starting Pascal self-DM cleanup...");

    // Find Pascal Tyrrell user
    let pascalUser = await db
      .select()
      .from(users)
      .where(
        or(
          eq(users.email, "pascal.tyrrell@gmail.com"),
          eq(users.name, "Pascal Tyrrell")
        )
      )
      .limit(1)
      .then((results) => results[0]);

    // If not found, try case-insensitive search
    if (!pascalUser) {
      const allUsers = await db.select().from(users);
      pascalUser = allUsers.find(
        (u) =>
          u.email?.toLowerCase().includes("pascal") ||
          u.name?.toLowerCase().includes("pascal")
      );
    }

    if (!pascalUser) {
      console.error(
        "Could not find Pascal user. Please check the user exists."
      );
      const allUsers = await db.select().from(users);
      console.log("Available users:");
      allUsers.forEach((u) => {
        console.log(`  - ${u.name || "No name"} (${u.email})`);
      });
      process.exit(1);
    }

    console.log(
      `Found Pascal user: ${pascalUser.name || pascalUser.email} (${pascalUser.id})`
    );

    const pascalName = pascalUser.name || "";
    const pascalEmail = pascalUser.email || "";

    // Find all DM channels where Pascal might be messaging himself
    // A self-DM is identified by:
    // 1. Channel type is "dm"
    // 2. Channel name matches Pascal's name or email
    // 3. Pascal has sent messages in this channel (OR channel was created by Pascal)
    const pascalDmChannels = await db
      .select()
      .from(channels)
      .where(
        and(
          eq(channels.type, "dm"),
          or(eq(channels.name, pascalName), eq(channels.name, pascalEmail))
        )
      );

    console.log(
      `Found ${pascalDmChannels.length} DM channels with Pascal's name/email`
    );

    // Check which of these channels Pascal has sent messages in (self-DMs)
    const selfDMChannels: typeof pascalDmChannels = [];
    for (const channel of pascalDmChannels) {
      const pascalMessages = await db
        .select()
        .from(messages)
        .where(
          and(
            eq(messages.channelId, channel.id),
            eq(messages.senderId, pascalUser.id)
          )
        );

      // Check if this is a self-DM:
      // - Channel name matches Pascal's name/email
      // - Pascal has sent messages in it
      // - Only Pascal has sent messages (no other users)
      const allMessages = await db
        .select()
        .from(messages)
        .where(eq(messages.channelId, channel.id));

      const onlyPascalMessages =
        allMessages.length > 0 &&
        allMessages.every((m) => m.senderId === pascalUser.id);

      console.log(
        `  Channel: ${channel.name} (${channel.id}) - Pascal messages: ${pascalMessages.length}, Total messages: ${allMessages.length}, Only Pascal: ${onlyPascalMessages}`
      );

      // If Pascal has sent messages AND channel name matches Pascal, it's a self-DM
      // (Pascal created a DM with himself - channel name = Pascal's name means Pascal is messaging himself)
      if (pascalMessages.length > 0) {
        selfDMChannels.push(channel);
        console.log(
          `  ✓ Identified as self-DM: ${channel.name} (${channel.id}) - Pascal sent ${pascalMessages.length} message(s)`
        );
      }
    }

    console.log(`Found ${selfDMChannels.length} self-DM channels to delete`);

    if (selfDMChannels.length === 0) {
      console.log("No Pascal self-DM channels found to delete.");
      process.exit(0);
    }

    // Show what will be deleted
    console.log("\nSelf-DM channels to be deleted:");
    selfDMChannels.forEach((c) => {
      console.log(`  - ${c.name} (${c.id})`);
    });

    // Delete messages in these channels first
    const channelIdsToDelete = selfDMChannels.map((c) => c.id);
    const _deletedMessages = await db
      .delete(messages)
      .where(inArray(messages.channelId, channelIdsToDelete));

    console.log(
      `\nDeleted messages from ${selfDMChannels.length} self-DM channels`
    );

    // Delete chat notifications for these channels
    await db
      .delete(schema.chatNotifications)
      .where(inArray(schema.chatNotifications.channelId, channelIdsToDelete));

    console.log(`Deleted notifications for ${selfDMChannels.length} channels`);

    // Delete the channels
    await db.delete(channels).where(inArray(channels.id, channelIdsToDelete));

    console.log(
      `\nSuccessfully deleted ${selfDMChannels.length} Pascal self-DM channels`
    );
    console.log("\nCleanup complete!");
  } catch (error) {
    console.error("Error during cleanup:", error);
    throw error;
  } finally {
    await client.end();
  }
}

removePascalSelfDM()
  .then(() => {
    console.log("Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  });
