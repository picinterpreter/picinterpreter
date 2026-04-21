/**
 * 生成占位 SVG 图片（开发用）。
 * 后续替换为真实 ARASAAC 图片。
 */
export function generatePlaceholderSvg(label: string, color: string = '#4A90D9'): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <rect width="100" height="100" rx="12" fill="${color}" opacity="0.15"/>
    <rect width="100" height="100" rx="12" fill="none" stroke="${color}" stroke-width="2"/>
    <text x="50" y="55" text-anchor="middle" font-size="24" font-family="sans-serif" fill="${color}">${label}</text>
  </svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

/**
 * 判断一个 imageUrl 是否可以直接喂给 <img src>。
 * 支持：http/https、相对路径（/seed/、./）、data:、blob:。
 * 仅当完全为空或明显不是合法资源时才回落到 placeholder。
 */
export function isRenderableImageUrl(url: string | undefined | null): boolean {
  if (!url) return false
  const u = url.trim()
  if (u.length === 0) return false
  return (
    u.startsWith('http://') ||
    u.startsWith('https://') ||
    u.startsWith('data:') ||
    u.startsWith('blob:') ||
    u.startsWith('/') ||
    u.startsWith('./') ||
    u.startsWith('../')
  )
}

/**
 * 统一的图片 src 解析：不可渲染时返回 placeholder。
 */
export function resolveImageSrc(
  url: string | undefined | null,
  label: string,
  color: string = '#4A90D9',
): string {
  return isRenderableImageUrl(url) ? url! : generatePlaceholderSvg(label, color)
}
