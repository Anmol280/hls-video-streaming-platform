/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  turbopack: {
    root: process.cwd(),
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
    NEXT_PUBLIC_STREAMING_URL:
      process.env.NEXT_PUBLIC_STREAMING_URL || 'http://localhost:3005',
  },
}

module.exports = nextConfig
