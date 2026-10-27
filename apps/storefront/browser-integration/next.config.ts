import path from "node:path";
import type { NextConfig } from "next";
if (process.env.BAZAR_BROWSER_INTEGRATION !== "1")
  throw new Error("Isolated browser UI is not a production application");
const config: NextConfig = {
  reactStrictMode: true,
  turbopack: { root: path.resolve(import.meta.dirname, "..") },
};
export default config;
