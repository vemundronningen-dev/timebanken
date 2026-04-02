import { NextResponse } from "next/server";
import { db } from "@/db";
import { timeEntries } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/lib/session";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await requireAuth();
  if (!userId) return NextResponse.json({ error: "Uautorisert" }, { status: 401 });

  const { id } = await params;
  const { comment } = await req.json();

  const [updated] = await db
    .update(timeEntries)
    .set({ comment: comment?.trim() || null })
    .where(and(eq(timeEntries.id, Number(id)), eq(timeEntries.userId, userId)))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Ikke funnet" }, { status: 404 });
  }
  return NextResponse.json(updated);
}
