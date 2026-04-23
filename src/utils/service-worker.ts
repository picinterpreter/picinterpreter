export const SERVICE_WORKER_ENABLED =
  process.env.NODE_ENV === 'production' &&
  process.env.NEXT_PUBLIC_ENABLE_SERVICE_WORKER === 'true'

export const SERVICE_WORKER_CACHE_PREFIX = 'tuyujia-'
export const SERVICE_WORKER_DISABLE_REFRESH_KEY = 'sw-disabled-refresh'
