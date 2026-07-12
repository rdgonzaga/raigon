import { ImageResponse } from "next/og";
import { site } from "@/lib/content";

export const alt = `${site.name} — Portfolio`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const VOID = "#0a0a0d";
const PANEL = "#131419";
const LINE = "#262932";
const LINE_STRONG = "#383c47";
const PAPER = "#edeef2";
const ASH_DIM = "#767b85";
const SIGNAL = "#39ff6a";
const LIVE = "#5fd98a";

const GLOW = `0 0 6px ${SIGNAL}88`;

async function loadJetBrainsMono(weight: number): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(
      `https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@${weight}`,
      { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 6.1) AppleWebKit/534.34" } }
    ).then((res) => res.text());
    const url = css.match(/src: url\(([^)]+)\)/)?.[1];
    if (!url) return null;
    const fontRes = await fetch(url);
    return fontRes.ok ? await fontRes.arrayBuffer() : null;
  } catch {
    return null;
  }
}

function WhoAmIRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: 28 }}>
      <div style={{ display: "flex", width: 110, color: ASH_DIM, fontWeight: 700 }}>{label}</div>
      <div style={{ display: "flex", color: LIVE }}>{value}</div>
    </div>
  );
}

export default async function Image() {
  const [regular, bold] = await Promise.all([loadJetBrainsMono(400), loadJetBrainsMono(700)]);
  const fonts = [regular, bold].every(Boolean)
    ? [
        { name: "JetBrains Mono", data: regular as ArrayBuffer, weight: 400 as const, style: "normal" as const },
        { name: "JetBrains Mono", data: bold as ArrayBuffer, weight: 700 as const, style: "normal" as const },
      ]
    : undefined;

  return new ImageResponse(
    (
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: VOID,
          fontFamily: fonts ? "JetBrains Mono" : "monospace",
        }}
      >
        <div
          style={{
            position: "absolute",
            display: "flex",
            width: 900,
            height: 900,
            left: 150,
            top: -220,
            borderRadius: 999,
            background: `radial-gradient(circle, ${SIGNAL}22 0%, transparent 65%)`,
          }}
        />
        <div
          style={{
            position: "absolute",
            display: "flex",
            width: "100%",
            height: "100%",
            backgroundImage: `repeating-linear-gradient(0deg, ${SIGNAL}0d 0px, ${SIGNAL}0d 1px, transparent 1px, transparent 4px)`,
          }}
        />

        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            width: 1080,
            height: 510,
            borderRadius: 10,
            border: `1px solid ${LINE_STRONG}`,
            background: PANEL,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "18px 28px",
              borderBottom: `1px solid ${LINE}`,
            }}
          >
            <div style={{ display: "flex", fontSize: 20, color: "#adb1ba" }}>whoami.sh</div>
            <div style={{ display: "flex", fontSize: 20, color: ASH_DIM }}>×</div>
          </div>

          <div
            style={{
              position: "absolute",
              display: "flex",
              width: "100%",
              height: "100%",
              backgroundImage: `repeating-linear-gradient(0deg, #00000000 0px, #00000000 2px, ${VOID}40 2px, ${VOID}40 4px)`,
            }}
          />

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              flex: 1,
              padding: "44px 56px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  display: "flex",
                  width: 10,
                  height: 10,
                  borderRadius: 999,
                  background: SIGNAL,
                }}
              />
              <div
                style={{
                  display: "flex",
                  fontSize: 22,
                  letterSpacing: 5,
                  textTransform: "uppercase",
                  color: SIGNAL,
                  textShadow: GLOW,
                }}
              >
                {site.handle}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
              <div
                style={{
                  display: "flex",
                  fontSize: 68,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: -2,
                  lineHeight: 1,
                  color: PAPER,
                }}
              >
                {site.name}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 22 }}>
                <WhoAmIRow label="focus" value={site.focus.join(" · ")} />
                <WhoAmIRow label="study" value={site.study} />
                <WhoAmIRow label="status" value={site.status} />
              </div>
            </div>

            <div style={{ display: "flex", fontSize: 22, color: LIVE, textShadow: GLOW }}>
              guest@{site.handle}:~$ whoami_
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts }
  );
}
