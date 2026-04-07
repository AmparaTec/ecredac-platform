/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
  typescript: {
    ignoreBuildErrors: true,  // TODO: fix TS types properly, then remove
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig
