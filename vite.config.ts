/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * 构建后把 dist/sw.js 里的占位版本号替换为真实构建时间戳。
 * 这样每次发布都会使旧缓存失效，用户能拿到最新资源。
 */
function injectSwVersion() {
  return {
    name: 'inject-sw-version',
    writeBundle() {
      const swPath = resolve(__dirname, 'dist/sw.js')
      if (!existsSync(swPath)) return
      const version = `v${Date.now()}`
      const content = readFileSync(swPath, 'utf8')
        .replace(/const CACHE_VERSION = '[^']*'/, `const CACHE_VERSION = '${version}'`)
      writeFileSync(swPath, content, 'utf8')
      console.log(`[inject-sw-version] CACHE_VERSION → ${version}`)
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), injectSwVersion()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  test: {
    globals: false,
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts', 'src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      // 只对纯工具函数强制覆盖率；Zustand stores 和 React 组件需要 DOM 环境
      include: ['src/utils/**/*.ts'],
      exclude: ['src/utils/arasaac-provider.ts'],
      thresholds: { lines: 70, functions: 70 },
    },
  },
})
