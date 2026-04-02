/**
 * Setup script: creates all tables and seeds demo data.
 * Uses the Neon HTTP adapter — no WebSocket needed.
 * Run: npx tsx db/setup.ts
 */
import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  console.log("Creating tables...");

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id         SERIAL PRIMARY KEY,
      email      TEXT NOT NULL UNIQUE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS projects (
      id         SERIAL PRIMARY KEY,
      user_id    INTEGER NOT NULL REFERENCES users(id),
      name       TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS time_entries (
      id               SERIAL PRIMARY KEY,
      user_id          INTEGER NOT NULL REFERENCES users(id),
      project_id       INTEGER NOT NULL REFERENCES projects(id),
      start_time       TIMESTAMP NOT NULL,
      end_time         TIMESTAMP,
      duration_minutes INTEGER,
      comment          TEXT,
      created_at       TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;

  console.log("Tables created.");

  // Seed demo user
  const [user] = await sql`
    INSERT INTO users (email)
    VALUES ('demo@example.com')
    ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
    RETURNING id
  `;
  const userId = user.id;
  console.log("Demo user id:", userId);

  // Seed starter projects
  await sql`
    INSERT INTO projects (user_id, name) VALUES
      (${userId}, 'General'),
      (${userId}, 'Development'),
      (${userId}, 'Meetings')
    ON CONFLICT DO NOTHING
  `;

  console.log("Seed complete. Ready to go!");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
