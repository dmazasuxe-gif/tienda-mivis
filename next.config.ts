import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: ['firebasestorage.googleapis.com'],
  },
  // Optimización para producción
  reactStrictMode: true,
};

export default nextConfig;
