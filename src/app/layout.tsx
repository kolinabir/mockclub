import type { Metadata } from "next";
import { Fraunces, Archivo, Fragment_Mono } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";

import { ThemeProvider } from "@/components/theme-provider";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["SOFT", "WONK", "opsz"],
});

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
});

const fragmentMono = Fragment_Mono({
  variable: "--font-mono-stamp",
  subsets: ["latin"],
  weight: "400",
});

// The canonical origin lives in one place: NEXT_PUBLIC_APP_URL (see lib/site.ts).
const SITE = SITE_URL;
const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  alternates: { canonical: "/" },
  title: {
    default: "MockClub — Free mock interviews with real people",
    template: "%s · MockClub",
  },
  description:
    "Free mock interviews with real people. Working professionals volunteer an hour to help you practise — any role, any language. Free forever, never AI.",
  keywords: [
    "free mock interview",
    "mock interview practice",
    "volunteer mentorship",
    "technical interview practice",
    "interview preparation",
  ],
  openGraph: {
    type: "website",
    url: SITE,
    siteName: "MockClub",
    title: "MockClub — Free mock interviews with real people",
    description:
      "Working professionals give an hour. People breaking in get real practice. Free forever, never AI.",
  },
  twitter: {
    card: "summary_large_image",
    title: "MockClub — Free mock interviews with real people",
    description:
      "Working professionals give an hour. People breaking in get real practice. Free forever, never AI.",
  },
  robots: { index: true, follow: true },
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
      className={`${fraunces.variable} ${archivo.variable} ${fragmentMono.variable}`}
    >
      {/* overflow-x-clip (not -hidden) — `hidden` would make <body> a scroll
          container and break both page scrolling and the sticky header. */}
      <head>
        {/* Reveal starts at opacity-0 and is shown by JS. Without this, a
            failed or blocked script would leave the whole page invisible. */}
        <noscript>
          <style>{`[data-reveal]{opacity:1!important;transform:none!important}`}</style>
        </noscript>
      </head>
      <body className="grain flex min-h-screen flex-col overflow-x-clip">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
        {GA_ID ? <GoogleAnalytics gaId={GA_ID} /> : null}
      </body>
    </html>
  );
}
