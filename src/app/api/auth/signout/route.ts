import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

async function handleSignOut(request: NextRequest) {
  const redirectUrl = new URL("/", request.url);
  const response = NextResponse.redirect(redirectUrl);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  await supabase.auth.signOut();

  // Belt-and-suspenders: explicitly delete every Supabase cookie
  for (const cookie of request.cookies.getAll()) {
    if (cookie.name.startsWith("sb-")) {
      response.cookies.set(cookie.name, "", { maxAge: 0, path: "/" });
    }
  }

  return response;
}

// GET: full-page sign-out redirect (bulletproof — clears all state)
export async function GET(request: NextRequest) {
  return handleSignOut(request);
}

// POST: API-style sign-out (kept for backwards compatibility)
export async function POST(request: NextRequest) {
  return handleSignOut(request);
}
