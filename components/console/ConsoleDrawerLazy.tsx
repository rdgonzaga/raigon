"use client";

import dynamic from "next/dynamic";

export const ConsoleDrawer = dynamic(
  () => import("./ConsoleDrawer").then((mod) => mod.ConsoleDrawer),
  { ssr: false }
);
