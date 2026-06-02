import type { NextConfig } from "next";

// Baseline security headers applied to every response.
// Content-Security-Policy is set per-request (with a nonce) in src/proxy.ts.
const securityHeaders = [
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
