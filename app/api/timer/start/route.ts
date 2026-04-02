import { NextResponse } from "next/server";
import { db } from "@/db";
import { timeEntries } from "@/db/schema";
import { eq, isNull, and } from "drizzle-orm";
import { DEMO_USER_ID } from "@/lib/user";

export async function POST(req: Request) {
  const { projectId } = await req.json();
  if (!projectId) {
    return NextResponse.json({ error: "projectId required" }, { status: 400 });
  }

  // Prevent multiple active timers
  const active = await db
    .select()
    .from(timeEntries)
    .where(
      and(eq(timeEntries.userId, DEMO_USER_ID), isNull(timeEntries.endTime))
    )
    .limit(1);

  if (active.length > 0) {
    return NextResponse.json(
      { error: "Timer already running", entry: active[0] },
      { status: 409 }
    );
  }

  const [entry] = await db
    .insert(timeEntries)
    .values({
      userId: DEMO_USER_ID,
      projectId: Number(projectId),
      startTime: new Date(),
    })
    .returning();

  return NextResponse.json(entry, { status: 201 });
}
