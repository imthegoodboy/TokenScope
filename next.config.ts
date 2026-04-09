import type { NextConfig } from "next";

const backendOrigin =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/v1\/?$/, "") ||
  "http://localhost:8000";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/v1/proxy/:proxyId",
        destination: `${backendOrigin}/api/v1/proxy/:proxyId`,
      },
    ];
  },
};

export default nextConfig;
