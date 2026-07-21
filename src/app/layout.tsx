import type { Metadata } from "next";
import { Fraunces, Archivo, Fragment_Mono } from "next/font/google";
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

const SITE = "https://mockclub.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: "MockClub — Free mock interviews with real people",
    template: "%s · MockClub",
  },
  description:
    "Made by devs, for everyone. A volunteer-run club where working professionals give an hour to practise interviews with people breaking in. Free forever. Real humans, never AI. Any language, any timezone.",
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
      className={`${fraunces.variable} ${archivo.variable} ${fragmentMono.variable}`}
    >
      {/* overflow-x-clip (not -hidden) — `hidden` would make <body> a scroll
          container and break both page scrolling and the sticky header. */}
      <body className="grain flex min-h-screen flex-col overflow-x-clip">
        {children}
      </body>
    </html>
  );
}
