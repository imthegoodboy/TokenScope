/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ["images.clerk.dev", "img.clerk.dev"],
  },
};

module.exports = nextConfig;
