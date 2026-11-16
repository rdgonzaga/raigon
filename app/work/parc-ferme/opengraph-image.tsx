import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { BrandMark } from "@/lib/brand-mark";
import { loadFont } from "@/lib/og-font";

export const alt = "Parc Fermé: an F1 model that called 78% of podium finishers live, against 56% from the starting grid";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const INK = "#f1eadc";
const MUTED = "#d8cdb8";
const ACCENT = "#e9b660";

export default async function Image() {
  const scene = await readFile(join(process.cwd(), "assets/og-scene.jpg"), "base64");
  const kicker = "Case study by Rainer Gonzaga";
  const title = "Parc Fermé";
  const stat = "78%";
  const line = "of podium finishers called live, against 56% from the starting grid";
  const text = `${kicker}${title}${stat}${line}raigon.dev`;
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
        <div style={{ position: "absolute", left: 0, top: 0, width: 1200, height: 630, display: "flex", background: "linear-gradient(90deg, rgba(27,24,20,0.88) 0%, rgba(27,24,20,0.66) 52%, rgba(27,24,20,0) 80%)" }} />
        <div style={{ position: "relative", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 72px", width: 780 }}>
          <div style={{ display: "flex", width: 56, height: 56 }}>
            <BrandMark size={56} />
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 26, fontWeight: 500, color: MUTED }}>{kicker}</div>
            <div style={{ display: "flex", marginTop: 10, fontSize: 76, fontWeight: 700, letterSpacing: -2.5, lineHeight: 1, color: INK }}>{title}</div>
            <div style={{ display: "flex", alignItems: "baseline", marginTop: 28 }}>
              <div style={{ display: "flex", fontSize: 64, fontWeight: 700, letterSpacing: -2, color: ACCENT }}>{stat}</div>
            </div>
            <div style={{ display: "flex", marginTop: 6, fontSize: 28, fontWeight: 500, lineHeight: 1.35, color: MUTED }}>{line}</div>
          </div>
          <div style={{ display: "flex", fontSize: 24, fontWeight: 500, color: MUTED }}>raigon.dev</div>
        </div>
      </div>
    ),
    { ...size, fonts }
  );
}
