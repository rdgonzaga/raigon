/** The site mark: the sun setting over the lake, in the sunset theme's colours. */
export function BrandMark({ size }: { size: number }) {
  const u = size / 32;
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        overflow: "hidden",
        borderRadius: size <= 64 ? 7 * u : 0, // iOS rounds the big one itself
        background: "linear-gradient(180deg, #4a3550 0%, #a2566a 58%, #e48a6a 100%)",
      }}
    >
      {/* the sun, half under the horizon */}
      <div
        style={{
          position: "absolute",
          left: 8 * u,
          top: 9 * u,
          width: 16 * u,
          height: 16 * u,
          borderRadius: "50%",
          background: "#e9b660",
        }}
      />
      {/* the lake */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 18 * u,
          width: "100%",
          height: 14 * u,
          background: "linear-gradient(180deg, #6a86a0 0%, #2f3e58 100%)",
        }}
      />
      {/* the sun's glint on the water */}
      <div style={{ position: "absolute", left: 10 * u, top: 21 * u, width: 12 * u, height: 2 * u, borderRadius: u, background: "#e9b660" }} />
      <div style={{ position: "absolute", left: 12.5 * u, top: 25 * u, width: 7 * u, height: 1.6 * u, borderRadius: u, background: "#e9b660", opacity: 0.7 }} />
    </div>
  );
}
