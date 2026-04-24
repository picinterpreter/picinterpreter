import type { NextConfig } from 'next'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = dirname(fileURLToPath(import.meta.url))
const isDevelopment = process.env.NODE_ENV === 'development'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  distDir: isDevelopment ? '.next-dev' : '.next',
  output: 'standalone',
  outputFileTracingRoot: projectRoot,
}

export default nextConfig
