
import { clerkClient, clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in",
  "/sign-up",
  "/api/webhook/register",
]);

export default clerkMiddleware(async (auth, req) => {
    const { userId,sessionClaims } = await auth(); 
    console.log("userId", userId);
const role = sessionClaims?.role as string | undefined;
  const url = req.nextUrl;
  const path = url.pathname;

  // Redirect unauthenticated users away from protected routes
  if (!userId && !isPublicRoute(req)) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  // Authenticated users logic
  if (userId) {
    try {
    // Admin accessing /dashboard should go to admin dashboard
    if (role === "admin" && path === "/dashboard") {
      return NextResponse.redirect(new URL("/admin/dashboard", req.url));
    }

    // Non-admin trying to access /admin
    if (role !== "admin" && path.startsWith("/admin")) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // Redirect signed-in users trying to visit public routes
    if (isPublicRoute(req)) {
      return NextResponse.redirect(
        new URL(role === "admin" ? "/admin/dashboard" : "/dashboard", req.url)
      );
    }
}
    catch (error) {
        console.error("Error fetching user data from Clerk:", error);
        return NextResponse.redirect(new URL("/error", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
