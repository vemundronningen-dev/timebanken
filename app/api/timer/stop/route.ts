import { NextResponse } from "next/server";
import { db } from "@/db";
import { timeEntries } from "@/db/schema";
import { eq, isNull, and } from "drizzle-orm";
import { requireAuth } from "@/lib/session";

export async function POST(req: Request) {
  const userId = await requireAuth();
  if (!userId) return NextResponse.json({ error: "Uautorisert" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const comment: string | undefined = body.comment?.trim() || undefined;

  const [active] = await db
    .select()
    .from(timeEntries)
    .where(and(eq(timeEntries.userId, userId), isNull(timeEntries.endTime)))
    .limit(1);

  if (!active) {
    return NextResponse.json({ error: "Ingen aktiv timer" }, { status: 404 });
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
