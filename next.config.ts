import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  async rewrites() {
    return [{ source: "/cv", destination: "/cv.pdf" }];
  },
};

export default nextConfig;
