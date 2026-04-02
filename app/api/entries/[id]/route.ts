import { NextResponse } from "next/server";
import { db } from "@/db";
import { timeEntries } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { DEMO_USER_ID } from "@/lib/user";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { comment } = await req.json();

  const [updated] = await db
    .update(timeEntries)
    .set({ comment: comment?.trim() || null })
    .where(
      and(eq(timeEntries.id, Number(id)), eq(timeEntries.userId, DEMO_USER_ID))
    )
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(updated);
}
