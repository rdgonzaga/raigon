import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Manrope } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { SiteBackground } from "@/components/background/SiteBackground";
import { EffectsProvider } from "@/lib/effects";
import { site } from "@/lib/content";

const INIT_SCRIPT = `
  try {
    var storedTheme = localStorage.getItem("theme");
    var prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (storedTheme === "light" || (!storedTheme && !prefersDark)) {
      document.documentElement.setAttribute("data-theme", "light");
    }
    if (localStorage.getItem("effects") === "off") {
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

const TITLE = `${site.name} | ${site.role} @ ING Hubs PH`;
const DESCRIPTION = `CS student at DLSU majoring in network & information security, and ${site.role} at ${site.employer}. Backend engineering, cybersecurity, and machine learning.`;

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: site.name,
  url: "https://www.raigon.dev",
  email: `mailto:${site.email}`,
  jobTitle: site.role,
  worksFor: { "@type": "Organization", name: site.employer },
  alumniOf: { "@type": "CollegeOrUniversity", name: "De La Salle University" },
  address: { "@type": "PostalAddress", addressCountry: "PH" },
  knowsAbout: site.focus,
  sameAs: [site.github, site.linkedin],
};

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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD).replace(/</g, "\\u003c") }}
        />
        <EffectsProvider>
          <SiteBackground />
          {children}
        </EffectsProvider>
      </body>
    </html>
  );
}
