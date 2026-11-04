/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: '10mb' }
  },
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    config.resolve.fallback = { ...config.resolve.fallback, fs: false };
    return config;
  }
};
module.exports = nextConfig;
