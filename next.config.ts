import type { NextConfig } from "next";

// Content-Security-Policy. Scripts/styles allow 'unsafe-inline' (the inline
// theme script + Tailwind/inline styles); everything else is tightly scoped to
// our own origin + Supabase. Tightening scripts to a nonce is a future step.
const isDev = process.env.NODE_ENV !== "production";
const csp = [
  "default-src 'self'",
  // 'unsafe-eval' only in dev (React dev tooling); never in production.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.supabase.co",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

// Baseline security headers applied to every response.
const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // Clickjacking protection
  { key: "X-Frame-Options", value: "DENY" },
  // Disallow MIME-type sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Don't leak full URLs to other origins
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Lock down powerful APIs we don't use
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  // Force HTTPS for two years (Vercel serves HTTPS)
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
