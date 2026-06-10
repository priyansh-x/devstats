/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@devstats/parsers", "@devstats/types"],
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client"],
  },
};
export default nextConfig;
