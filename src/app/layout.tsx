import type { Metadata } from "next";
import { Cormorant_Garamond, Geist, Geist_Mono } from "next/font/google";
import { DEFAULT_SITE_URL, getSiteMetadataBase } from "@/lib/site/url";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: getSiteMetadataBase(),
  title: {
    default: "Hey Ralli",
    template: "%s | Hey Ralli",
  },
  description:
    "Plan PTO campaigns, create artwork, draft captions, and publish to Facebook and Instagram — one calm workspace for busy school teams.",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: DEFAULT_SITE_URL,
    siteName: "Hey Ralli",
    title: "Hey Ralli",
    description:
      "Plan PTO campaigns, create artwork, draft captions, and publish to Facebook and Instagram — one calm workspace for busy school teams.",
  },
  alternates: {
    canonical: "/",
  },
};

const supabaseOrigin = (() => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
})();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${cormorant.variable} h-full antialiased`}
    >
      {supabaseOrigin ? (
        <>
          <link rel="preconnect" href={supabaseOrigin} />
          <link rel="dns-prefetch" href={supabaseOrigin} />
        </>
      ) : null}
      <body className="min-h-full bg-cos-bg font-sans text-cos-text">{children}</body>
    </html>
  );
}
