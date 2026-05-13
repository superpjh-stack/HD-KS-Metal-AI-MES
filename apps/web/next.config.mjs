/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@ks-mes/ui'],
  experimental: {
    serverComponentsExternalPackages: [],
  },
};

export default nextConfig;
