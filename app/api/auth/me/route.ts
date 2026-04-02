import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Uautorisert" }, { status: 401 });
  }
  return NextResponse.json({ userId: session.userId, email: session.email, name: session.name });
}
