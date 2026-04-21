/**
 * 图语家 Service Worker — 离线优先缓存策略
 *
 * 策略：
 *   - App Shell（HTML/JS/CSS）：Cache First，版本更新时刷新
 *   - /seed/*.json：Cache First（本地图库数据）
 *   - ARASAAC / GlobalSymbols 图片：Stale-While-Revalidate，离线时用缓存
 *   - LLM API 请求：Network Only（不缓存，降级到 TemplateNLG 由前端处理）
 *
 * 版本号：每次 build 时由 vite.config.ts 的 injectSwVersion 插件替换为时间戳
 */

const CACHE_VERSION = 'v2'
const SHELL_CACHE   = `tuyujia-shell-${CACHE_VERSION}`
const IMAGE_CACHE   = `tuyujia-images-${CACHE_VERSION}`
const SEED_CACHE    = `tuyujia-seed-${CACHE_VERSION}`

const SHELL_URLS = [
  '/',
  '/index.html',
]

const SEED_URLS = [
  '/seed/categories.json',
  '/seed/pictograms.json',
]

// ── Install ──────────────────────────────────────────────────────────────── //
self.addEventListener('install', (event) => {
  // 注意：不在此处调用 skipWaiting()。
  // 新版 SW 安装完成后进入 waiting 状态，前端检测到后显示"新版本可用"横幅。
  // 用户确认更新后，前端发送 SKIP_WAITING 消息，才激活新版本。
  event.waitUntil(
    Promise.all([
      caches.open(SHELL_CACHE).then((c) => c.addAll(SHELL_URLS).catch(() => {})),
      caches.open(SEED_CACHE).then((c) => c.addAll(SEED_URLS).catch(() => {})),
    ])
  )
})

// ── Message（SKIP_WAITING）──────────────────────────────────────────────── //
self.addEventListener('message', (event) => {
  if (!event.data || event.data.type !== 'SKIP_WAITING') return
  // 仅接受同源客户端发来的消息，防止跨源触发
  if (event.source && new URL(event.source.url).origin !== self.location.origin) return
  self.skipWaiting()
})

// ── Activate ─────────────────────────────────────────────────────────────── //
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith('tuyujia-') && !k.endsWith(CACHE_VERSION))
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  )
})

// ── Fetch ────────────────────────────────────────────────────────────────── //
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // LLM API 请求 → Network Only（不缓存）
  // 精确匹配已知 LLM 端点，避免用 `includes('api.')` 误伤其他第三方域名
  const LLM_HOSTS = ['api.openai.com', 'api.anthropic.com', 'api.deepseek.com']
  if (
    url.pathname.includes('/chat/completions') ||
    LLM_HOSTS.some((h) => url.hostname === h || url.hostname.endsWith('.' + h))
  ) {
    return
  }

  // ARASAAC / GlobalSymbols 图片 → Stale-While-Revalidate
  if (
    url.hostname.includes('arasaac.org') ||
    url.hostname.includes('globalsymbols.com') ||
    url.hostname.includes('cdncboard.azureedge.net')
  ) {
    event.respondWith(staleWhileRevalidate(request, IMAGE_CACHE))
    return
  }

  // 种子数据 → Cache First
  if (url.pathname.startsWith('/seed/')) {
    event.respondWith(cacheFirst(request, SEED_CACHE))
    return
  }

  // App Shell (JS/CSS/HTML) → Cache First
  if (
    url.origin === self.location.origin &&
    (url.pathname === '/' ||
     url.pathname.endsWith('.js') ||
     url.pathname.endsWith('.css') ||
     url.pathname.endsWith('.html'))
  ) {
    event.respondWith(cacheFirst(request, SHELL_CACHE))
    return
  }
})

// ── 缓存策略实现 ─────────────────────────────────────────────────────────── //
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  if (cached) return cached
  try {
    const response = await fetch(request)
    if (response.ok) cache.put(request, response.clone())
    return response
  } catch {
    return new Response('Offline', { status: 503 })
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone())
      return response
    })
    .catch(() => null)

  return cached ?? (await fetchPromise) ?? new Response('Offline', { status: 503 })
}
