import { NextResponse, type NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const session = req.cookies.get("tt_session");
  const { pathname } = req.nextUrl;

  // Redirect logged-in users away from auth pages
  if (session && (pathname === "/logg-inn" || pathname === "/registrer")) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Protect dashboard
  if (!session && pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/logg-inn", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/logg-inn", "/registrer"],
};
