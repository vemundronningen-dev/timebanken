import { NextResponse } from "next/server";
import { db } from "@/db";
import { timeEntries, projects } from "@/db/schema";
import { eq, and, gte, isNull } from "drizzle-orm";
import { DEMO_USER_ID } from "@/lib/user";

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
