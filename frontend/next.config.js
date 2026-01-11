/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: true,
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
    NEXT_PUBLIC_CDP_PROJECT_ID: process.env.NEXT_PUBLIC_CDP_PROJECT_ID || "8e28f0d5-c1f5-4024-a134-1be7e58c26ab"

  }
}

module.exports = nextConfig
