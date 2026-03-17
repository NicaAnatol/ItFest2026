/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  // Ensure static assets are properly served
  assetPrefix: process.env.NEXT_PUBLIC_ASSET_PREFIX || undefined,
}

export default nextConfig
