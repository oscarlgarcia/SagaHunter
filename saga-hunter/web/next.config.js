/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["ioredis"],
  },
};

const withNextIntl = require("next-intl/plugin")();

module.exports = withNextIntl(nextConfig);
