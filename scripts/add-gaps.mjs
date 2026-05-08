import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FILE = path.join(__dirname, '../public/seed/pictograms.json')

function arasaac(id) {
  return `https://static.arasaac.org/pictograms/${id}/${id}_300.png`
}

// Current max manualOrder per category (from seed as of this script):
// objects: 3, places: 6, daily: (no manualOrder), actions: (no manualOrder)
// We append starting from max+1

const NEW_ENTRIES = [
  // --- objects (休息舒适) --- append after index 3 ---
  // clothes
  {
    id: 'o_trousers',
    labels: { zh: ['裤子'], en: ['trousers', 'pants'] },
    synonyms: ['裤', '长裤'],
    imageUrl: arasaac(2565),
    categoryId: 'objects',
    manualOrder: 4,
    usageCount: 0,
    disambiguationHints: { semanticDomain: 'objects' },
  },
  {
    id: 'o_shoes',
    labels: { zh: ['鞋'], en: ['shoes'] },
    synonyms: ['鞋子', '脚踝'],
    imageUrl: arasaac(2622),
    categoryId: 'objects',
    manualOrder: 5,
    usageCount: 0,
    disambiguationHints: { semanticDomain: 'objects' },
  },
  {
    id: 'o_socks',
    labels: { zh: ['袜子'], en: ['socks'] },
    synonyms: ['袜', '长袜'],
    imageUrl: arasaac(2298),
    categoryId: 'objects',
    manualOrder: 6,
    usageCount: 0,
    disambiguationHints: { semanticDomain: 'objects' },
  },
  {
    id: 'o_coat',
    labels: { zh: ['外套'], en: ['coat', 'jacket'] },
    synonyms: ['上衣', '外衣', '大衣'],
    imageUrl: arasaac(2242),
    categoryId: 'objects',
    manualOrder: 7,
    usageCount: 0,
    disambiguationHints: { semanticDomain: 'objects' },
  },
  {
    id: 'o_hat',
    labels: { zh: ['帽子'], en: ['hat'] },
    synonyms: ['帽', '头盔'],
    imageUrl: arasaac(2572),
    categoryId: 'objects',
    manualOrder: 8,
    usageCount: 0,
    disambiguationHints: { semanticDomain: 'objects' },
  },
  // home objects
  {
    id: 'o_door',
    labels: { zh: ['门'], en: ['door'] },
    synonyms: ['门口', '房门'],
    imageUrl: arasaac(3244),
    categoryId: 'objects',
    manualOrder: 9,
    usageCount: 0,
    disambiguationHints: { semanticDomain: 'objects' },
  },
  {
    id: 'o_window',
    labels: { zh: ['窗户'], en: ['window'] },
    synonyms: ['窗', '窗口'],
    imageUrl: arasaac(2611),
    categoryId: 'objects',
    manualOrder: 10,
    usageCount: 0,
    disambiguationHints: { semanticDomain: 'objects' },
  },
  {
    id: 'o_charger',
    labels: { zh: ['充电器'], en: ['charger'] },
    synonyms: ['充电线', '充电', '电源'],
    imageUrl: arasaac(27651),
    categoryId: 'objects',
    manualOrder: 11,
    usageCount: 0,
    disambiguationHints: { semanticDomain: 'objects' },
  },
  // rest/comfort actions
  {
    id: 'o_noisy',
    labels: { zh: ['吵'], en: ['noisy'] },
    synonyms: ['太吵', '吵闹', '噪音'],
    imageUrl: arasaac(7157),
    categoryId: 'objects',
    manualOrder: 12,
    usageCount: 0,
    disambiguationHints: { semanticDomain: 'objects' },
  },
  {
    id: 'o_quiet',
    labels: { zh: ['安静'], en: ['quiet'] },
    synonyms: ['请安静', '保持安静'],
    imageUrl: arasaac(38050),
    categoryId: 'objects',
    manualOrder: 13,
    usageCount: 0,
    disambiguationHints: { semanticDomain: 'objects' },
  },
  {
    id: 'o_light_off',
    labels: { zh: ['关灯'], en: ['turn off light'] },
    synonyms: ['灯关掉', '关一下灯'],
    imageUrl: arasaac(38247),
    categoryId: 'objects',
    manualOrder: 14,
    usageCount: 0,
    disambiguationHints: { semanticDomain: 'objects' },
  },
  {
    id: 'o_light_on',
    labels: { zh: ['开灯'], en: ['turn on light'] },
    synonyms: ['灯开着', '开一下灯'],
    imageUrl: arasaac(38212),
    categoryId: 'objects',
    manualOrder: 15,
    usageCount: 0,
    disambiguationHints: { semanticDomain: 'objects' },
  },

  // --- places --- append after index 6 ---
  {
    id: 'pl_room',
    labels: { zh: ['房间'], en: ['room'] },
    synonyms: ['房子', '房里'],
    imageUrl: arasaac(32234),
    categoryId: 'places',
    manualOrder: 7,
    usageCount: 0,
    disambiguationHints: { semanticDomain: 'places' },
  },

  // --- transport → places ---
  {
    id: 'pl_bus',
    labels: { zh: ['公交车'], en: ['bus'] },
    synonyms: ['公交', '巴士', '大巴'],
    imageUrl: arasaac(2262),
    categoryId: 'places',
    manualOrder: 8,
    usageCount: 0,
    disambiguationHints: { semanticDomain: 'places' },
  },
  {
    id: 'pl_taxi',
    labels: { zh: ['出租车'], en: ['taxi'] },
    synonyms: ['打车', '的士', '滴滴'],
    imageUrl: arasaac(2580),
    categoryId: 'places',
    manualOrder: 9,
    usageCount: 0,
    disambiguationHints: { semanticDomain: 'places' },
  },
  {
    id: 'pl_subway',
    labels: { zh: ['地铁'], en: ['subway', 'metro'] },
    synonyms: ['metro', '轨道交通'],
    imageUrl: arasaac(26925),
    categoryId: 'places',
    manualOrder: 10,
    usageCount: 0,
    disambiguationHints: { semanticDomain: 'places' },
  },

  // --- daily (厕所卫生) ---
  {
    id: 'hy_soap',
    labels: { zh: ['肥皂'], en: ['soap'] },
    synonyms: ['洗手液', '皂'],
    imageUrl: arasaac(2964),
    categoryId: 'daily',
    manualOrder: 15,
    usageCount: 0,
    disambiguationHints: { semanticDomain: 'hygiene' },
  },
  {
    id: 'hy_shampoo',
    labels: { zh: ['洗发水'], en: ['shampoo'] },
    synonyms: ['洗头', '洗发液'],
    imageUrl: arasaac(2699),
    categoryId: 'daily',
    manualOrder: 16,
    usageCount: 0,
    disambiguationHints: { semanticDomain: 'hygiene' },
  },
  {
    id: 'hy_wet',
    labels: { zh: ['湿了'], en: ['wet'] },
    synonyms: ['湿', '湿透', '弄湿了'],
    imageUrl: arasaac(37364),
    categoryId: 'daily',
    manualOrder: 17,
    usageCount: 0,
    disambiguationHints: { semanticDomain: 'hygiene' },
  },
  {
    id: 'hy_dirty',
    labels: { zh: ['脏了'], en: ['dirty'] },
    synonyms: ['脏', '弄脏了', '不干净'],
    imageUrl: arasaac(4750),
    categoryId: 'daily',
    manualOrder: 18,
    usageCount: 0,
    disambiguationHints: { semanticDomain: 'hygiene' },
  },

  // --- actions ---
  {
    id: 'a_speak',
    labels: { zh: ['说话'], en: ['speak', 'talk'] },
    synonyms: ['讲话', '发言', '开口'],
    imageUrl: arasaac(6517),
    categoryId: 'actions',
    manualOrder: 28,
    usageCount: 0,
    disambiguationHints: { semanticDomain: 'actions' },
  },
  {
    id: 'a_wait',
    labels: { zh: ['等'], en: ['wait'] },
    synonyms: ['等等', '等一会', '等候'],
    imageUrl: arasaac(36914),
    categoryId: 'actions',
    manualOrder: 29,
    usageCount: 0,
    disambiguationHints: { semanticDomain: 'actions' },
  },
]

const data = JSON.parse(readFileSync(FILE, 'utf8'))

const existingIds = new Set(data.map(p => p.id))
for (const entry of NEW_ENTRIES) {
  if (existingIds.has(entry.id)) {
    console.error(`DUPLICATE ID: ${entry.id}`)
    process.exit(1)
  }
}

data.push(...NEW_ENTRIES)
writeFileSync(FILE, JSON.stringify(data, null, 2) + '\n', 'utf8')
console.log(`Added ${NEW_ENTRIES.length} entries. Total: ${data.length}`)
