import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Keeps the dev-mode badge out of the page (and out of screenshots).
  devIndicators: false,
}

export default nextConfig
