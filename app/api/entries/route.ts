import { NextResponse } from "next/server";
import { db } from "@/db";
import { timeEntries, projects } from "@/db/schema";
import { eq, and, gte, isNull } from "drizzle-orm";
import { DEMO_USER_ID } from "@/lib/user";

export async function POST(req: Request) {
  const { projectId, startTime, endTime, comment } = await req.json();

  if (!projectId || !startTime || !endTime) {
    return NextResponse.json(
      { error: "projectId, startTime and endTime are required" },
      { status: 400 }
    );
  }

  const start = new Date(startTime);
  const end = new Date(endTime);

  if (end <= start) {
    return NextResponse.json(
      { error: "End time must be after start time" },
      { status: 400 }
    );
  }

  const durationMinutes = Math.round(
    (end.getTime() - start.getTime()) / 60000
  );

  const [entry] = await db
    .insert(timeEntries)
    .values({
      userId: DEMO_USER_ID,
      projectId: Number(projectId),
      startTime: start,
      endTime: end,
      durationMinutes,
      comment: comment?.trim() || null,
    })
    .returning();

  return NextResponse.json(entry, { status: 201 });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const filter = searchParams.get("filter"); // "today" | "active" | "all"

  const conditions = [eq(timeEntries.userId, DEMO_USER_ID)];

  if (filter === "today") {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    conditions.push(gte(timeEntries.startTime, todayStart));
  } else if (filter === "active") {
    conditions.push(isNull(timeEntries.endTime));
  }

  const rows = await db
    .select({
      id: timeEntries.id,
      projectId: timeEntries.projectId,
      projectName: projects.name,
      startTime: timeEntries.startTime,
      endTime: timeEntries.endTime,
      durationMinutes: timeEntries.durationMinutes,
      comment: timeEntries.comment,
      createdAt: timeEntries.createdAt,
    })
    .from(timeEntries)
    .innerJoin(projects, eq(timeEntries.projectId, projects.id))
    .where(and(...conditions))
    .orderBy(timeEntries.startTime);

  return NextResponse.json(rows);
}
