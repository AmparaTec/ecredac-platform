/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
  typescript: {
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig
