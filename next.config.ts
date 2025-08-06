import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
        pathname: '/**',
      },
    ],
  },
  env: {
    NC_URL: process.env.NC_URL,
    NC_TOKEN: process.env.NC_TOKEN,
    NOCODB_PROJECT_ID: process.env.NOCODB_PROJECT_ID,
    NOCODB_TABLE_ID: process.env.NOCODB_TABLE_ID,
  },
};

export default nextConfig;
