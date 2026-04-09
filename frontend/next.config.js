const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // R3F pulls in react-reconciler, which needs React's dev internals. Next's resolver
  // can pick `react.shared-subset` (via the "react-server" export), which has no internals.
  transpilePackages: ["three", "@react-three/fiber", "@react-three/drei"],
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      react: path.join(__dirname, "node_modules/react/index.js"),
      "react-dom": path.join(__dirname, "node_modules/react-dom/index.js"),
    };
    return config;
  },
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.clerk.dev" },
      { protocol: "https", hostname: "img.clerk.dev" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
  },
  // Enable caching headers for production
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, must-revalidate" },
        ],
      },
      {
        source: "/assets/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
