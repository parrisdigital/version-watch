import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  async redirects() {
    return [
      { source: "/review/login", destination: "/admin/login", permanent: true },
      { source: "/review/:id", destination: "/admin/review/:id", permanent: true },
      { source: "/review", destination: "/admin/review", permanent: true },
      { source: "/ops/health", destination: "/admin/health", permanent: true },
      { source: "/ops/:path*", destination: "/admin", permanent: true },
    ];
  },
};

export default nextConfig;
