import { NextResponse } from "next/server";
import { db } from "@/db";
import { timeEntries } from "@/db/schema";
import { eq, isNull, and } from "drizzle-orm";
import { requireAuth } from "@/lib/session";

export async function POST(req: Request) {
  const userId = await requireAuth();
  if (!userId) return NextResponse.json({ error: "Uautorisert" }, { status: 401 });

  const { projectId } = await req.json();
  if (!projectId) {
    return NextResponse.json({ error: "projectId required" }, { status: 400 });
  }

  const active = await db
    .select()
    .from(timeEntries)
    .where(and(eq(timeEntries.userId, userId), isNull(timeEntries.endTime)))
    .limit(1);

  if (active.length > 0) {
    return NextResponse.json(
      { error: "Timer kjører allerede", entry: active[0] },
      { status: 409 }
    );
  }

  const [entry] = await db
    .insert(timeEntries)
    .values({ userId, projectId: Number(projectId), startTime: new Date() })
    .returning();

  return NextResponse.json(entry, { status: 201 });
}
