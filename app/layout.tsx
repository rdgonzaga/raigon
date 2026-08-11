import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Manrope } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { SiteBackground } from "@/components/background/SiteBackground";
import { LagNudge } from "@/components/background/LagNudge";
import { EffectsProvider } from "@/lib/effects";
import { site } from "@/lib/content";

const INIT_SCRIPT = `
  try {
    var storedTheme = localStorage.getItem("theme");
    var prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (storedTheme === "light" || (!storedTheme && !prefersDark)) {
      document.documentElement.setAttribute("data-theme", "light");
    }
    if (localStorage.getItem("effects") !== "on") {
      document.documentElement.setAttribute("data-effects", "off");
    }
  } catch (e) {}
`;

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const TITLE = "Rainer Gonzaga | Portfolio";
const DESCRIPTION = site.tagline;

export const metadata: Metadata = {
  metadataBase: new URL("https://www.raigon.dev"),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    url: "/",
    siteName: TITLE,
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f5ee" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0d" },
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
      className={`${jetbrainsMono.variable} ${manrope.variable} h-full scroll-smooth antialiased`}
    >
      <body className="min-h-full flex flex-col bg-void text-paper font-sans">
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: INIT_SCRIPT }}
        />
        <EffectsProvider>
          <SiteBackground />
          <LagNudge />
          {children}
        </EffectsProvider>
      </body>
    </html>
  );
}
