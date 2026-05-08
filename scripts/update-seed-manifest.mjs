/**
 * 生成 public/seed/manifest.json。
 * 在 prebuild / predev 时自动运行，也可手动执行：
 *   node scripts/update-seed-manifest.mjs
 *
 * manifest 里的 seedHash 是两个 seed 文件内容的合并哈希。
 * 前端启动时拿 manifest.seedHash 和 localStorage 比对，
 * 不一致时自动重新导入 seed，不需要手动 bump SEED_VERSION。
 */
import { createHash } from 'crypto'
import { readFileSync, writeFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SEED_DIR = path.join(__dirname, '../public/seed')

function md5(buf) {
  return createHash('md5').update(buf).digest('hex').slice(0, 12)
}

const pictogramsHash = md5(readFileSync(path.join(SEED_DIR, 'pictograms.json')))
const categoriesHash  = md5(readFileSync(path.join(SEED_DIR, 'categories.json')))
const seedHash = md5(pictogramsHash + categoriesHash)

const manifest = {
  seedHash,
  pictogramsHash,
  categoriesHash,
  generatedAt: new Date().toISOString().split('T')[0],
}

writeFileSync(
  path.join(SEED_DIR, 'manifest.json'),
  JSON.stringify(manifest, null, 2) + '\n',
  'utf8',
)

console.log('seed manifest updated:', manifest)
