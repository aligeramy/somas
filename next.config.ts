import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fix turbopack root warning
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
