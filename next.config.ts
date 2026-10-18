import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  async redirects() {
    return [{ source: "/cv", destination: "/Gonzaga_Resume.pdf", permanent: false }];
  },
};

export default nextConfig;
