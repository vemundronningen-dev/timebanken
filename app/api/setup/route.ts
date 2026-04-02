import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

/**
 * One-time setup: creates tables and seeds the demo user + starter projects.
 * Visit /api/setup once after deploying to initialize the database.
 * Safe to call multiple times (uses IF NOT EXISTS / ON CONFLICT).
 */
export async function GET() {
  const sql = neon(process.env.DATABASE_URL!);

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

  const [user] = await sql`
    INSERT INTO users (email)
    VALUES ('demo@example.com')
    ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
    RETURNING id
  `;

  await sql`
    INSERT INTO projects (user_id, name) VALUES
      (${user.id}, 'General'),
      (${user.id}, 'Development'),
      (${user.id}, 'Meetings')
    ON CONFLICT DO NOTHING
  `;

  return NextResponse.json({
    ok: true,
    message: "Database ready. You can now use the app.",
    userId: user.id,
  });
}
