import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { site } from "@/lib/content";
import { BrandMark } from "@/lib/brand-mark";
import { loadFont } from "@/lib/og-font";

export const alt = `${site.name}, ${site.role} at ${site.employer}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const INK = "#f1eadc";
const MUTED = "#d8cdb8";
const ACCENT = "#e9b660";

export default async function Image() {
  const scene = await readFile(join(process.cwd(), "assets/og-scene.jpg"), "base64");
  const role = `${site.role} @ ING Hubs PH`;
  const text = `${site.name}${role}${site.tagline}raigon.dev`;
  const [regular, bold] = await Promise.all([loadFont(500, text), loadFont(700, text)]);
  const fonts =
    regular && bold
      ? [
          { name: "Familjen Grotesk", data: regular, weight: 500 as const, style: "normal" as const },
          { name: "Familjen Grotesk", data: bold, weight: 700 as const, style: "normal" as const },
        ]
      : undefined;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", fontFamily: fonts ? "Familjen Grotesk" : "sans-serif" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`data:image/jpeg;base64,${scene}`} width={1200} height={630} alt="" style={{ position: "absolute", left: 0, top: 0 }} />
        {/* darken the left so the text reads over the sky */}
        <div style={{ position: "absolute", left: 0, top: 0, width: 1200, height: 630, display: "flex", background: "linear-gradient(90deg, rgba(27,24,20,0.85) 0%, rgba(27,24,20,0.62) 50%, rgba(27,24,20,0) 78%)" }} />
        <div style={{ position: "relative", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 72px", width: 760 }}>
          <div style={{ display: "flex", width: 56, height: 56 }}>
            <BrandMark size={56} />
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 76, fontWeight: 700, letterSpacing: -2.5, lineHeight: 1, color: INK }}>{site.name}</div>
            <div style={{ display: "flex", marginTop: 16, fontSize: 30, fontWeight: 500, color: ACCENT }}>{role}</div>
            <div style={{ display: "flex", marginTop: 28, fontSize: 30, fontWeight: 500, lineHeight: 1.35, color: MUTED }}>{site.tagline}</div>
          </div>
          <div style={{ display: "flex", fontSize: 24, fontWeight: 500, color: MUTED }}>raigon.dev</div>
        </div>
      </div>
    ),
    { ...size, fonts }
  );
}
