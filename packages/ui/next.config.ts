import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployment
  output: "standalone",

  // @resvg/resvg-js is a native Node module that must not be bundled by webpack
  serverExternalPackages: ['@resvg/resvg-js'],

  // Configure image domains for Audible cover art
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "m.media-amazon.com",
        pathname: "/images/**",
      },
      {
        protocol: "https",
        hostname: "images-na.ssl-images-amazon.com",
        pathname: "/images/**",
      },
    ],
  },
};

export default nextConfig;
