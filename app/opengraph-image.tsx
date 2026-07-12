import { ImageResponse } from "next/og";
import { site } from "@/lib/content";

export const alt = `${site.name} — Portfolio`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const VOID = "#0a0a0d";
const PANEL = "#131419";
const LINE = "#262932";
const PAPER = "#edeef2";
const ASH = "#adb1ba";
const ASH_DIM = "#767b85";
const SIGNAL = "#39ff6a";
const LIVE = "#5fd98a";

export default function Image() {
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
          fontFamily: "monospace",
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
            border: `1px solid ${LINE}`,
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
            <div style={{ display: "flex", fontSize: 20, color: ASH }}>whoami.sh</div>
            <div style={{ display: "flex", fontSize: 20, color: ASH_DIM }}>×</div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              flex: 1,
              padding: "48px 56px",
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
                  fontSize: 24,
                  letterSpacing: 5,
                  textTransform: "uppercase",
                  color: SIGNAL,
                }}
              >
                {site.handle}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div
                style={{
                  display: "flex",
                  fontSize: 84,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: -2,
                  color: PAPER,
                  lineHeight: 1,
                }}
              >
                {site.name}
              </div>
              <div style={{ display: "flex", fontSize: 28, color: ASH }}>
                {site.focus.join("  ·  ")}
              </div>
            </div>

            <div style={{ display: "flex", fontSize: 24, color: LIVE }}>
              guest@{site.handle}:~$ whoami_
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
