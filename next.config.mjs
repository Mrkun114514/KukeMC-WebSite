/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['cravatar.eu', 'kuke.ink', 'api.kuke.ink', 'q1.qlogo.cn'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  experimental: {
    // serverActions: true, // Enabled by default in Next.js 14
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  transpilePackages: ['tiptap-markdown'],
};

export default nextConfig;
