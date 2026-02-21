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

async function cleanupGroupChats() {
  try {
    console.log("Starting group chat cleanup...");

    // Find the "apscal" user (Pascal Tyrrell)
    // Try to find by email or name containing "pascal" or "apscal"
    let apscalUser = await db
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
    if (!apscalUser) {
      const allUsers = await db.select().from(users);
      apscalUser = allUsers.find(
        (u) =>
          u.email?.toLowerCase().includes("pascal") ||
          u.email?.toLowerCase().includes("apscal") ||
          u.name?.toLowerCase().includes("pascal") ||
          u.name?.toLowerCase().includes("apscal")
      );
    }

    if (!apscalUser) {
      console.error(
        "Could not find 'apscal' user. Please check the user exists."
      );
      const allUsers = await db.select().from(users);
      console.log("Available users:");
      allUsers.forEach((u) => {
        console.log(`  - ${u.name || "No name"} (${u.email})`);
      });
      process.exit(1);
    }

    console.log(
      `Found apscal user: ${apscalUser.name || apscalUser.email} (${apscalUser.id})`
    );

    // Find all DM channels involving apscal
    // Channels named after apscal (someone created a DM with them)
    const apscalDmChannels = await db
      .select()
      .from(channels)
      .where(
        and(
          eq(channels.type, "dm"),
          or(
            eq(channels.name, apscalUser.name || ""),
            eq(channels.name, apscalUser.email || "")
          )
        )
      );

    // Also find channels where apscal has sent messages
    const apscalMessageChannels = await db
      .selectDistinct({ channelId: messages.channelId })
      .from(messages)
      .where(eq(messages.senderId, apscalUser.id));

    const apscalChannelIds = new Set([
      ...apscalDmChannels.map((c) => c.id),
      ...apscalMessageChannels.map((m) => m.channelId),
    ]);

    console.log(`Found ${apscalChannelIds.size} channels involving apscal`);

    // Get all global channels (to keep)
    const globalChannels = await db
      .select()
      .from(channels)
      .where(eq(channels.type, "global"));

    const globalChannelIds = new Set(globalChannels.map((c) => c.id));
    console.log(`Found ${globalChannelIds.size} global channels to keep`);

    // Get all channels to keep (global + apscal DMs)
    const _channelsToKeep = new Set([...globalChannelIds, ...apscalChannelIds]);

    // Get all group channels
    const allGroupChannels = await db
      .select()
      .from(channels)
      .where(eq(channels.type, "group"));

    console.log(`Found ${allGroupChannels.length} group channels`);

    // Filter out channels to keep - delete ALL group channels
    // (group channels are separate from DMs, so we delete all of them)
    const groupChannelsToDelete = allGroupChannels;

    console.log(`Will delete ${groupChannelsToDelete.length} group channels`);

    if (groupChannelsToDelete.length === 0) {
      console.log("No group channels to delete.");
      process.exit(0);
    }

    // Show what will be deleted
    console.log("\nGroup channels to be deleted:");
    groupChannelsToDelete.forEach((c) => {
      console.log(`  - ${c.name} (${c.id})`);
    });

    // Delete messages in these channels first
    const channelIdsToDelete = groupChannelsToDelete.map((c) => c.id);
    await db
      .delete(messages)
      .where(inArray(messages.channelId, channelIdsToDelete));

    console.log(
      `\nDeleted messages from ${groupChannelsToDelete.length} channels`
    );

    // Delete chat notifications for these channels
    await db
      .delete(schema.chatNotifications)
      .where(inArray(schema.chatNotifications.channelId, channelIdsToDelete));

    console.log(
      `Deleted notifications for ${groupChannelsToDelete.length} channels`
    );

    // Delete the channels
    await db.delete(channels).where(inArray(channels.id, channelIdsToDelete));

    console.log(
      `\nSuccessfully deleted ${groupChannelsToDelete.length} group channels`
    );
    console.log("\nCleanup complete!");
  } catch (error) {
    console.error("Error during cleanup:", error);
    throw error;
  } finally {
    await client.end();
  }
}

cleanupGroupChats()
  .then(() => {
    console.log("Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  });
