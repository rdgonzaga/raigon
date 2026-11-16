import type { Metadata, Viewport } from "next";
import { Familjen_Grotesk } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { site } from "@/lib/content";

const INIT_SCRIPT = `
  try {
    // sunset (dark) for first-time visitors whatever their OS theme; morning only once chosen
    if (localStorage.getItem("theme") === "light") {
      document.documentElement.setAttribute("data-theme", "light");
    }
  } catch (e) {}
  // a refresh starts at the top of the walk, not where the reader left off (a shared #section link still jumps there)
  try {
    history.scrollRestoration = "manual";
    var nav = performance.getEntriesByType("navigation")[0];
    if (nav && nav.type === "reload") {
      if (location.hash) history.replaceState(null, "", location.pathname + location.search);
      scrollTo(0, 0);
      // the browser can still restore the old spot once layout settles, so reset again after load
      addEventListener("load", function () { requestAnimationFrame(function () { scrollTo(0, 0); }); });
    }
  } catch (e) {}
  // the home page waits behind its loader until the lake is drawn (MeadowScene lifts it); after 5 s it shows anyway and the lake keeps loading behind
  if (location.pathname === "/" && !/[?&]shot/.test(location.search) && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    var d = document.documentElement;
    d.classList.add("rg-booting");
    setTimeout(function () { d.classList.remove("rg-booting"); }, 5000);
  }
`;

const familjen = Familjen_Grotesk({
  variable: "--font-familjen",
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
    { media: "(prefers-color-scheme: light)", color: "#6f93a8" },
    { media: "(prefers-color-scheme: dark)", color: "#4a3550" },
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
      className={`${familjen.variable} scroll-smooth antialiased`}
    >
      <body>
        {/* a plain inline script runs while the HTML parses, before anything below is painted;
            next/script's beforeInteractive ran late enough for the hero to flash before the loader */}
        <script dangerouslySetInnerHTML={{ __html: INIT_SCRIPT }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD).replace(/</g, "\\u003c") }}
        />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
