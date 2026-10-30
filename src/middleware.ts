import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const SUPABASE_CONFIGURED = SUPABASE_URL.startsWith("http");

export async function middleware(req: NextRequest) {
  if (!SUPABASE_CONFIGURED) return NextResponse.next({ request: req });
  let response = NextResponse.next({ request: req });
  const supabase = createServerClient(
    SUPABASE_URL,
    SUPABASE_ANON,
    {
      cookies: {
        getAll() { return req.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          response = NextResponse.next({ request: req });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );
  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
