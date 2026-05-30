import withSerwistInit from "@serwist/next";
import type { NextConfig } from "next";

const withSerwist = withSerwistInit({
  swSrc: "src/sw.ts",     // Service worker source file
  swDest: "public/sw.js", // Output destination of service worker
  disable: process.env.NODE_ENV === "development", // Disable in development for easy HMR
});

const nextConfig: NextConfig = {
  reactCompiler: true,
};

export default withSerwist(nextConfig);
