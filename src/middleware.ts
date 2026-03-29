import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "enfuce_session";
const SESSION_VALUE = "authenticated";

const protectedPaths = [
  "/dashboard",
  "/settings",
  "/onboarding",
  "/screening",
  "/queue",
  "/review",
  "/audit",
];

export function middleware(request: NextRequest) {
  const session = request.cookies.get(SESSION_COOKIE)?.value;
  const isLoggedIn = session === SESSION_VALUE;
  const path = request.nextUrl.pathname;

  const isProtected = protectedPaths.some((p) => path.startsWith(p));

  if (!isLoggedIn && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (isLoggedIn && (path === "/login" || path === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
