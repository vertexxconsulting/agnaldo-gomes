import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['3000-ikfmxxggopitmkq31vq9q-6d0ffc35.us3.manus.computer'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'http2.mlstatic.com',
      },
    ],
  },
};

export default nextConfig;
