import { describe, it, expect } from 'vitest'
import {
  generatePlaceholderSvg,
  isRenderableImageUrl,
  resolveImageSrc,
} from '../generate-placeholder-svg'

// ─── generatePlaceholderSvg ─────────────────────────────────────────────── //

describe('generatePlaceholderSvg', () => {
  it('returns a data: URI', () => {
    const result = generatePlaceholderSvg('吃')
    expect(result).toMatch(/^data:image\/svg\+xml,/)
  })

  it('embeds the label text in the SVG', () => {
    const result = generatePlaceholderSvg('喝水')
    const decoded = decodeURIComponent(result.replace('data:image/svg+xml,', ''))
    expect(decoded).toContain('喝水')
  })

  it('embeds the custom color', () => {
    const result = generatePlaceholderSvg('测试', '#FF0000')
    const decoded = decodeURIComponent(result.replace('data:image/svg+xml,', ''))
    expect(decoded).toContain('#FF0000')
  })

  it('uses default color when none provided', () => {
    const result = generatePlaceholderSvg('测试')
    const decoded = decodeURIComponent(result.replace('data:image/svg+xml,', ''))
    expect(decoded).toContain('#4A90D9')
  })

  it('produces valid XML structure', () => {
    const result = generatePlaceholderSvg('ok')
    const decoded = decodeURIComponent(result.replace('data:image/svg+xml,', ''))
    expect(decoded).toContain('<svg')
    expect(decoded).toContain('</svg>')
    expect(decoded).toContain('viewBox')
  })
})

// ─── isRenderableImageUrl ───────────────────────────────────────────────── //

describe('isRenderableImageUrl', () => {
  it.each([
    ['https://example.com/img.png', true],
    ['http://localhost:5173/seed/img.png', true],
    ['data:image/png;base64,abc123', true],
    ['blob:http://localhost/uuid', true],
    ['/seed/pictograms/eat.png', true],
    ['./images/foo.svg', true],
    ['../assets/bar.png', true],
  ])('%s → %s', (url, expected) => {
    expect(isRenderableImageUrl(url)).toBe(expected)
  })

  it.each([
    [null, false],
    [undefined, false],
    ['', false],
    ['   ', false],
    ['just-a-string', false],
    ['ftp://example.com/file', false],
    ['C:\\Windows\\file.png', false],
  ])('%s → false', (url, expected) => {
    expect(isRenderableImageUrl(url as string | null | undefined)).toBe(expected)
  })
})

// ─── resolveImageSrc ────────────────────────────────────────────────────── //

describe('resolveImageSrc', () => {
  it('returns the URL directly when it is renderable', () => {
    const url = 'https://example.com/pic.png'
    expect(resolveImageSrc(url, '吃', '#000')).toBe(url)
  })

  it('returns a relative URL unchanged', () => {
    const url = '/seed/pictograms/eat.png'
    expect(resolveImageSrc(url, '吃', '#000')).toBe(url)
  })

  it('falls back to placeholder for null URL', () => {
    const result = resolveImageSrc(null, '吃', '#16a34a')
    expect(result).toMatch(/^data:image\/svg\+xml,/)
    const decoded = decodeURIComponent(result.replace('data:image/svg+xml,', ''))
    expect(decoded).toContain('吃')
    expect(decoded).toContain('#16a34a')
  })

  it('falls back to placeholder for empty string', () => {
    const result = resolveImageSrc('', '饭', '#000')
    expect(result).toMatch(/^data:image\/svg\+xml,/)
  })

  it('falls back to placeholder for non-URL string', () => {
    const result = resolveImageSrc('not-a-url', '水', '#000')
    expect(result).toMatch(/^data:image\/svg\+xml,/)
  })

  it('passes default color to placeholder when not specified', () => {
    const result = resolveImageSrc(undefined, '药')
    const decoded = decodeURIComponent(result.replace('data:image/svg+xml,', ''))
    expect(decoded).toContain('#4A90D9')
  })
})
