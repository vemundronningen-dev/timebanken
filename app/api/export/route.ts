import { NextResponse } from "next/server";
import { db } from "@/db";
import { timeEntries, projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/session";

function escapeCSV(value: string | null | undefined): string {
  if (value == null) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET() {
  const userId = await requireAuth();
  if (!userId) return NextResponse.json({ error: "Uautorisert" }, { status: 401 });

  const rows = await db
    .select({
      id: timeEntries.id,
      projectName: projects.name,
      startTime: timeEntries.startTime,
      endTime: timeEntries.endTime,
      durationMinutes: timeEntries.durationMinutes,
      comment: timeEntries.comment,
      createdAt: timeEntries.createdAt,
    })
    .from(timeEntries)
    .innerJoin(projects, eq(timeEntries.projectId, projects.id))
    .where(eq(timeEntries.userId, userId))
    .orderBy(timeEntries.startTime);

  const header = "ID,Prosjekt,Starttid,Sluttid,Varighet (min),Kommentar,Opprettet";
  const csvRows = rows.map((r) =>
    [
      r.id,
      escapeCSV(r.projectName),
      r.startTime ? new Date(r.startTime).toISOString() : "",
      r.endTime ? new Date(r.endTime).toISOString() : "",
      r.durationMinutes ?? "",
      escapeCSV(r.comment),
      r.createdAt ? new Date(r.createdAt).toISOString() : "",
    ].join(",")
  );

  const csv = [header, ...csvRows].join("\r\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="timer-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
