import type { Metadata, Viewport } from "next";
import { Fraunces, Hanken_Grotesk } from "next/font/google";
import "./globals.css";
import ThemeToggle from "@/components/theme-toggle";
import ServiceWorker from "@/components/service-worker";
import { THEME_SCRIPT } from "@/lib/theme-script";

// Display: characterful old-style serif with optical sizing + true italics.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz", "SOFT"],
});

// UI / body: warm humanist grotesque.
const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Upward — a quiet space for becoming",
  description:
    "Upward is a universal tracker that adapts to you. Track anything, grow steadily, and watch the small steps add up.",
  applicationName: "Upward",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Upward",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

// Per-request CSP nonces require dynamic rendering across the app.
export const dynamic = "force-dynamic";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4ede1" },
    { media: "(prefers-color-scheme: dark)", color: "#0e0b14" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${fraunces.variable} ${hanken.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        {children}
        <ThemeToggle />
        <ServiceWorker />
      </body>
    </html>
  );
}
