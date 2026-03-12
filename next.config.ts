import type { NextConfig } from "next";
import withPWA from "next-pwa";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/lcsh-pwa",
  images: {
    unoptimized: true,
  },
};

const pwaConfig = withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
});

// Export with webpack configuration for PWA support
export default pwaConfig(nextConfig);
