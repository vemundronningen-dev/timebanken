import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/session";

export async function POST(req: Request) {
  const { email, password } = await req.json();

  if (!email?.trim() || !password) {
    return NextResponse.json(
      { error: "E-post og passord er påkrevd." },
      { status: 400 }
    );
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase().trim()))
    .limit(1);

  if (!user || !user.passwordHash) {
    return NextResponse.json(
      { error: "Feil e-post eller passord." },
      { status: 401 }
    );
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json(
      { error: "Feil e-post eller passord." },
      { status: 401 }
    );
  }

  const session = await getSession();
  session.userId = user.id;
  session.email = user.email;
  session.name = user.name;
  await session.save();

  return NextResponse.json({ ok: true, name: user.name });
}
