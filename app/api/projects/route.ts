import { NextResponse } from "next/server";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/session";

export async function GET() {
  const userId = await requireAuth();
  if (!userId) return NextResponse.json({ error: "Uautorisert" }, { status: 401 });

  const rows = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, userId))
    .orderBy(projects.name);
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const userId = await requireAuth();
  if (!userId) return NextResponse.json({ error: "Uautorisert" }, { status: 401 });

  const { name } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "Navn er påkrevd" }, { status: 400 });
  }
  const [project] = await db
    .insert(projects)
    .values({ userId, name: name.trim() })
    .returning();
  return NextResponse.json(project, { status: 201 });
}
