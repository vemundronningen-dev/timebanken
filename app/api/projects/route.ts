import { NextResponse } from "next/server";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { DEMO_USER_ID } from "@/lib/user";

export async function GET() {
  const rows = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, DEMO_USER_ID))
    .orderBy(projects.name);
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const { name } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }
  const [project] = await db
    .insert(projects)
    .values({ userId: DEMO_USER_ID, name: name.trim() })
    .returning();
  return NextResponse.json(project, { status: 201 });
}
