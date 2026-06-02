import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase/env";
import { THEME_SCRIPT } from "@/lib/theme-script";

const PROTECTED_PREFIXES = ["/app"];

// sha256 of the inline theme script, so the CSP allows it without a nonce
// (a nonce attribute on it would cause a hydration mismatch).
let themeHashPromise: Promise<string> | null = null;
async function themeScriptHash(): Promise<string> {
  if (!themeHashPromise) {
    themeHashPromise = (async () => {
      const data = new TextEncoder().encode(THEME_SCRIPT);
      const digest = await crypto.subtle.digest("SHA-256", data);
      let bin = "";
      for (const b of new Uint8Array(digest)) bin += String.fromCharCode(b);
      return `'sha256-${btoa(bin)}'`;
    })();
  }
  return themeHashPromise;
}

function buildCsp(nonce: string, themeHash: string): string {
  const isProd = process.env.NODE_ENV === "production";
  // React needs eval() only in dev; HMR uses a localhost websocket in dev.
  const scriptExtra = isProd ? "" : " 'unsafe-eval'";
  const connectExtra = isProd ? "" : " ws://localhost:* http://localhost:*";
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' ${themeHash} 'strict-dynamic'${scriptExtra}`,
    // Inline style attributes (charts, progress bars, aurora) need this.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://*.supabase.co",
    "font-src 'self' data:",
    `connect-src 'self' https://*.supabase.co wss://*.supabase.co${connectExtra}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isProd ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

// Next.js 16: "Proxy" is the renamed Middleware. Sets a per-request CSP nonce
// and refreshes the Supabase session cookie.
export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce, await themeScriptHash());

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", csp);

  let response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("content-security-policy", csp);

  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({
            request: { headers: requestHeaders },
          });
          response.headers.set("content-security-policy", csp);
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    });

    // IMPORTANT: do not run logic between client creation and getUser().
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { pathname } = request.nextUrl;
    const isProtected = PROTECTED_PREFIXES.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`),
    );
    if (isProtected && !user) {
      const url = request.nextUrl.clone();
      url.pathname = "/signin";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * All paths except static assets, images, and prefetches.
     */
    {
      source:
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
      missing: [{ type: "header", key: "next-router-prefetch" }],
    },
  ],
};
