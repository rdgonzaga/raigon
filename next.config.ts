import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pinned explicitly because this project is sometimes checked out as a
  // git worktree nested under the main repo, which has its own lockfile —
  // without this, Turbopack has to guess which one is the real root.
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
