/**
 * CI 护栏：确保 public/seed/manifest.json 与实际 seed 文件同步。
 *
 * 如果有人改了 pictograms.json 或 categories.json 但没有重新生成 manifest，
 * 这个测试会 fail，提示运行 `node scripts/update-seed-manifest.mjs`。
 */

import { describe, it, expect } from 'vitest'
import { createHash } from 'crypto'
import { readFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SEED_DIR = path.resolve(__dirname, '../../../public/seed')

function md5(buf: Buffer | string): string {
  return createHash('md5').update(buf).digest('hex').slice(0, 12)
}

const manifest = JSON.parse(
  readFileSync(path.join(SEED_DIR, 'manifest.json'), 'utf8')
) as { seedHash: string; pictogramsHash: string; categoriesHash: string }

describe('seed manifest 同步检查', () => {
  it('manifest.pictogramsHash 与实际文件一致', () => {
    const actual = md5(readFileSync(path.join(SEED_DIR, 'pictograms.json')))
    expect(
      actual,
      `pictograms.json 已改动但 manifest 未更新。请运行：node scripts/update-seed-manifest.mjs`
    ).toBe(manifest.pictogramsHash)
  })

  it('manifest.categoriesHash 与实际文件一致', () => {
    const actual = md5(readFileSync(path.join(SEED_DIR, 'categories.json')))
    expect(
      actual,
      `categories.json 已改动但 manifest 未更新。请运行：node scripts/update-seed-manifest.mjs`
    ).toBe(manifest.categoriesHash)
  })

  it('manifest.seedHash 是 pictogramsHash + categoriesHash 的合并哈希', () => {
    const expected = md5(manifest.pictogramsHash + manifest.categoriesHash)
    expect(
      expected,
      `manifest.seedHash 与分项哈希不一致，manifest 可能被手动篡改`
    ).toBe(manifest.seedHash)
  })
})
