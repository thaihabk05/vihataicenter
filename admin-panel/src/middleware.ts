import { NextRequest, NextResponse } from "next/server";

/**
 * Extract tenant slug from subdomain.
 *
 * Examples:
 *   vihat.localhost:3000    → "vihat"
 *   acme.example.com        → "acme"
 *   localhost:3000           → "" (no subdomain → default tenant)
 *   app.example.com          → "" (if "app" is a reserved prefix)
 */
function extractTenantSlug(host: string): string {
  // Remove port
  const hostname = host.split(":")[0];

  // localhost with subdomain: "vihat.localhost" → "vihat"
  if (hostname.endsWith(".localhost")) {
    return hostname.replace(".localhost", "");
  }

  // Production: "vihat.yourdomain.com" → "vihat"
  const parts = hostname.split(".");
  if (parts.length >= 3) {
    const subdomain = parts[0];
    // Reserved subdomains that are NOT tenant slugs
    const reserved = ["www", "app", "api", "admin"];
    if (!reserved.includes(subdomain)) {
      return subdomain;
    }
  }

  return ""; // No subdomain → will use default tenant
}

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") || "localhost:3000";
  const slug = extractTenantSlug(host);

  const response = NextResponse.next();

  // Set tenant slug as a cookie so client components can read it
  // Also set as a response header for server components
  response.cookies.set("tenant-slug", slug, {
    path: "/",
    httpOnly: false, // Client JS needs to read this
    sameSite: "lax",
  });
  response.headers.set("x-tenant-slug", slug);

  return response;
}

export const config = {
  // Run on all routes except static files and API
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
