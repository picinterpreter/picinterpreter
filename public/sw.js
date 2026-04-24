/**
 * Temporary cleanup Service Worker.
 *
 * Purpose:
 *   - take over existing clients immediately
 *   - clear legacy tuyujia-* caches
 *   - unregister itself
 *   - force controlled pages to reload from network
 *
 * Keep this file uncached on the server so returning users fetch it promptly.
 */

const CACHE_PREFIX = 'tuyujia-'

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(cleanupAndReloadClients())
})

async function cleanupAndReloadClients() {
  const cacheKeys = await caches.keys()
  await Promise.all(
    cacheKeys
      .filter((key) => key.startsWith(CACHE_PREFIX))
      .map((key) => caches.delete(key)),
  )

  await self.clients.claim()
  await self.registration.unregister()

  const clients = await self.clients.matchAll({
    includeUncontrolled: true,
    type: 'window',
  })

  await Promise.all(
    clients.map(async (client) => {
      try {
        await client.navigate(client.url)
      } catch {
        // Ignore stale or closing clients.
      }
    }),
  )
}
