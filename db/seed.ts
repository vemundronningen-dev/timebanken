/**
 * Seed script: creates the demo user and a few starter projects.
 * Run once after db:push: npx tsx db/seed.ts
 */
import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function main() {
  // Upsert demo user (id will be 1 on a fresh DB)
  const [user] = await db
    .insert(schema.users)
    .values({ email: "demo@example.com" })
    .onConflictDoNothing()
    .returning();

  const userId = user?.id ?? 1;
  console.log("Demo user id:", userId);

  // Insert starter projects
  await db
    .insert(schema.projects)
    .values([
      { userId, name: "General" },
      { userId, name: "Development" },
      { userId, name: "Meetings" },
    ])
    .onConflictDoNothing();

  console.log("Seed complete.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
