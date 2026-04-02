import { NextResponse } from "next/server";
import { db } from "@/db";
import { timeEntries } from "@/db/schema";
import { eq, isNull, and } from "drizzle-orm";
import { DEMO_USER_ID } from "@/lib/user";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const comment: string | undefined = body.comment?.trim() || undefined;

  // Find active timer
  const [active] = await db
    .select()
    .from(timeEntries)
    .where(
      and(eq(timeEntries.userId, DEMO_USER_ID), isNull(timeEntries.endTime))
    )
    .limit(1);

  if (!active) {
    return NextResponse.json({ error: "No active timer" }, { status: 404 });
  }

  const now = new Date();
  const durationMinutes = Math.round(
    (now.getTime() - active.startTime.getTime()) / 60000
  );

  const [updated] = await db
    .update(timeEntries)
    .set({ endTime: now, durationMinutes, comment })
    .where(eq(timeEntries.id, active.id))
    .returning();

  return NextResponse.json(updated);
}
