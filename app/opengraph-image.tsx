import { ImageResponse } from "next/og";
import { site } from "@/lib/content";

export const alt = `${site.name} — Portfolio`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const VOID = "#f8f5ee";
const PANEL = "#eeeae0";
const LINE = "#c7bfa8";
const LINE_STRONG = "#a99f84";
const PAPER = "#2b271f";
const ASH_DIM = "#8a8371";
const SIGNAL = "#96650f";
const LIVE = "#a8710f";

const PROMPT_LINE_1 = `┌──(guest@${site.handle})-[~]`;
const PROMPT_LINE_2 = "└─$ whoami_";
const GLYPHS = [
  site.handle,
  site.name,
  "focus study status",
  site.focus.join(" · "),
  site.study,
  site.status,
  "whoami.sh",
  "×",
  PROMPT_LINE_1,
  PROMPT_LINE_2,
].join(" ");
const FONT_TEXT = Array.from(new Set(`${GLYPHS}${GLYPHS.toUpperCase()}`)).join("");

async function loadJetBrainsMono(weight: number): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(
      `https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@${weight}&text=${encodeURIComponent(FONT_TEXT)}`,
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
        {/* gradient bubbles, matching PageGlow's low-effects ambient background */}
        <div
          style={{
            position: "absolute",
            display: "flex",
            width: 620,
            height: 520,
            left: -150,
            top: 60,
            background: `radial-gradient(circle, ${SIGNAL}24 0%, transparent 70%)`,
          }}
        />
        <div
          style={{
            position: "absolute",
            display: "flex",
            width: 620,
            height: 520,
            right: -150,
            top: 220,
            background: `radial-gradient(circle, ${SIGNAL}24 0%, transparent 70%)`,
          }}
        />
        <div
          style={{
            position: "absolute",
            display: "flex",
            width: 460,
            height: 420,
            left: 260,
            bottom: -230,
            background: `radial-gradient(circle, ${SIGNAL}1c 0%, transparent 70%)`,
          }}
        />
        <div
          style={{
            position: "absolute",
            display: "flex",
            width: 380,
            height: 340,
            right: 120,
            bottom: -180,
            background: `radial-gradient(circle, ${SIGNAL}20 0%, transparent 70%)`,
          }}
        />
        <div
          style={{
            position: "absolute",
            display: "flex",
            width: 320,
            height: 300,
            left: 60,
            top: -160,
            background: `radial-gradient(circle, ${SIGNAL}18 0%, transparent 70%)`,
          }}
        />
        {/* top-center glow, matching SiteBackground's reduced-motion gradient stack */}
        <div
          style={{
            position: "absolute",
            display: "flex",
            width: "60%",
            height: "60%",
            left: "20%",
            top: -190,
            background: `radial-gradient(circle, ${SIGNAL}1f 0%, transparent 70%)`,
          }}
        />
        {/* scanline texture, matching SiteBackground's reduced-motion gradient stack */}
        <div
          style={{
            position: "absolute",
            display: "flex",
            width: "100%",
            height: "100%",
            backgroundImage: `repeating-linear-gradient(0deg, ${SIGNAL}0d 0px, ${SIGNAL}0d 1px, transparent 1px, transparent 3px)`,
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
            <div style={{ display: "flex", fontSize: 20, fontWeight: 700, color: PAPER }}>whoami.sh</div>
            <div style={{ display: "flex", fontSize: 20, color: ASH_DIM }}>×</div>
          </div>

          <div
            style={{
              position: "absolute",
              display: "flex",
              width: "100%",
              height: "100%",
              backgroundImage: `repeating-linear-gradient(0deg, #00000000 0px, #00000000 2px, ${LINE_STRONG}30 2px, ${LINE_STRONG}30 4px)`,
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

            <div style={{ display: "flex", flexDirection: "column", fontSize: 22, color: LIVE }}>
              <div style={{ display: "flex" }}>{PROMPT_LINE_1}</div>
              <div style={{ display: "flex" }}>{PROMPT_LINE_2}</div>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts }
  );
}
