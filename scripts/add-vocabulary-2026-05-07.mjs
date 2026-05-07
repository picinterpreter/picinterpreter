/**
 * 2026-05-07 词库扩充脚本
 * 填充 repair、activities 两个空分类，补全 emotions/places/people/objects/food 缺口
 * 运行: node scripts/add-vocabulary-2026-05-07.mjs
 */

import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PICTOGRAMS_PATH = path.join(__dirname, '../public/seed/pictograms.json')

function arasaac(id) {
  return `https://static.arasaac.org/pictograms/${id}/${id}_300.png`
}

// New entries to add. manualOrder will be assigned per-category at write time.
const NEW_ENTRIES = [
  // ── REPAIR 修正澄清 (9 items) ──────────────────────────────────────────────
  {
    id: 'r_speak_slowly',
    categoryId: 'repair',
    imageUrl: arasaac(4676),
    labels: { zh: ['说慢一点'], en: ['speak slowly'] },
    synonyms: ['慢一点', '慢慢说'],
    disambiguationHints: { semanticDomain: 'repair' },
  },
  {
    id: 'r_close_enough',
    categoryId: 'repair',
    imageUrl: arasaac(30383),
    labels: { zh: ['差不多'], en: ['close enough', 'almost'] },
    synonyms: ['接近', '大概'],
    disambiguationHints: { semanticDomain: 'repair' },
  },
  {
    id: 'r_use_picture',
    categoryId: 'repair',
    imageUrl: arasaac(7108),
    labels: { zh: ['用图片'], en: ['use picture', 'show picture'] },
    synonyms: ['给我看图', '图片'],
    disambiguationHints: { semanticDomain: 'repair' },
  },
  {
    id: 'r_help_find_word',
    categoryId: 'repair',
    imageUrl: arasaac(9837),
    labels: { zh: ['帮我找词'], en: ['help me find the word'] },
    synonyms: ['帮我说', '找词'],
    disambiguationHints: { semanticDomain: 'repair' },
  },
  {
    id: 'r_no_rush',
    categoryId: 'repair',
    imageUrl: arasaac(27333),
    labels: { zh: ['先别急'], en: ['no rush', 'patience'] },
    synonyms: ['不急', '等等我'],
    disambiguationHints: { semanticDomain: 'repair' },
  },
  {
    id: 'r_i_mean_this',
    categoryId: 'repair',
    imageUrl: arasaac(39234),
    labels: { zh: ['我是这个意思'], en: ['I mean this', 'confirm'] },
    synonyms: ['就是这个', '我的意思是'],
    disambiguationHints: { semanticDomain: 'repair' },
  },
  {
    id: 'r_know_cant_say',
    categoryId: 'repair',
    imageUrl: arasaac(16885),
    labels: { zh: ['我知道但说不出来'], en: ["I know but can't say it"] },
    synonyms: ['说不出来', '我懂但表达不了'],
    disambiguationHints: { semanticDomain: 'repair' },
  },
  {
    id: 'r_forgot_word',
    categoryId: 'repair',
    imageUrl: arasaac(26258),
    labels: { zh: ['我忘了这个词'], en: ['I forgot the word'] },
    synonyms: ['忘词了', '想不起来'],
    disambiguationHints: { semanticDomain: 'repair' },
  },
  {
    id: 'r_rephrase',
    categoryId: 'repair',
    imageUrl: arasaac(37360),
    labels: { zh: ['我想换一个说法'], en: ['rephrase', 'say it another way'] },
    synonyms: ['换个说法', '换一种方式'],
    disambiguationHints: { semanticDomain: 'repair' },
  },

  // ── ACTIVITIES 日常活动 (7 items) ──────────────────────────────────────────
  {
    id: 'a_lie_down',
    categoryId: 'activities',
    imageUrl: arasaac(8242),
    labels: { zh: ['躺'], en: ['lie down'] },
    synonyms: ['躺下', '平躺'],
    disambiguationHints: { semanticDomain: 'activity' },
  },
  {
    id: 'a_go_out',
    categoryId: 'activities',
    imageUrl: arasaac(2806),
    labels: { zh: ['出门'], en: ['go out', 'exit'] },
    synonyms: ['出去', '外出'],
    disambiguationHints: { semanticDomain: 'activity' },
  },
  {
    id: 'a_go_home',
    categoryId: 'activities',
    imageUrl: arasaac(39494),
    labels: { zh: ['回家'], en: ['go home', 'go back'] },
    synonyms: ['回去', '返回家'],
    disambiguationHints: { semanticDomain: 'activity' },
  },
  {
    id: 'a_rehab_training',
    categoryId: 'activities',
    imageUrl: arasaac(14672),
    labels: { zh: ['康复训练'], en: ['rehabilitation', 'rehab training'] },
    synonyms: ['康复', '训练', '康复练习'],
    disambiguationHints: { semanticDomain: 'activity' },
  },
  {
    id: 'a_practice',
    categoryId: 'activities',
    imageUrl: arasaac(10156),
    labels: { zh: ['练习'], en: ['practice', 'exercise'] },
    synonyms: ['训练', '锻炼'],
    disambiguationHints: { semanticDomain: 'activity' },
  },
  {
    id: 'a_wear',
    categoryId: 'activities',
    imageUrl: arasaac(14534),
    labels: { zh: ['穿衣'], en: ['put on clothes', 'dress'] },
    synonyms: ['穿', '穿上'],
    disambiguationHints: { semanticDomain: 'activity' },
  },
  {
    id: 'a_take_off_clothes',
    categoryId: 'activities',
    imageUrl: arasaac(11233),
    labels: { zh: ['脱衣'], en: ['undress', 'take off clothes'] },
    synonyms: ['脱', '脱掉'],
    disambiguationHints: { semanticDomain: 'activity' },
  },

  // ── EMOTIONS 情绪 (+8 items) ───────────────────────────────────────────────
  {
    id: 'p_tired',
    categoryId: 'emotions',
    imageUrl: arasaac(35537),
    labels: { zh: ['累'], en: ['tired', 'exhausted'] },
    synonyms: ['疲劳', '疲倦', '没力气'],
    disambiguationHints: { semanticDomain: 'emotion' },
  },
  {
    id: 'p_nervous',
    categoryId: 'emotions',
    imageUrl: arasaac(30391),
    labels: { zh: ['紧张'], en: ['nervous', 'anxious'] },
    synonyms: ['不安', '焦虑'],
    disambiguationHints: { semanticDomain: 'emotion' },
  },
  {
    id: 'p_bored',
    categoryId: 'emotions',
    imageUrl: arasaac(35531),
    labels: { zh: ['无聊'], en: ['bored'] },
    synonyms: ['没意思', '闷'],
    disambiguationHints: { semanticDomain: 'emotion' },
  },
  {
    id: 'p_anxious',
    categoryId: 'emotions',
    imageUrl: arasaac(36675),
    labels: { zh: ['着急'], en: ['urgent', 'in a hurry'] },
    synonyms: ['急', '心急'],
    disambiguationHints: { semanticDomain: 'emotion' },
  },
  {
    id: 'p_lonely',
    categoryId: 'emotions',
    imageUrl: arasaac(7253),
    labels: { zh: ['孤单'], en: ['lonely', 'alone'] },
    synonyms: ['孤独', '寂寞'],
    disambiguationHints: { semanticDomain: 'emotion' },
  },
  {
    id: 'p_dejected',
    categoryId: 'emotions',
    imageUrl: arasaac(32329),
    labels: { zh: ['沮丧'], en: ['dejected', 'downhearted'] },
    synonyms: ['失落', '郁闷'],
    disambiguationHints: { semanticDomain: 'emotion' },
  },
  {
    id: 'p_calm',
    categoryId: 'emotions',
    imageUrl: arasaac(31310),
    labels: { zh: ['平静'], en: ['calm', 'peaceful'] },
    synonyms: ['安静', '放松'],
    disambiguationHints: { semanticDomain: 'emotion' },
  },
  {
    id: 'p_upset',
    categoryId: 'emotions',
    imageUrl: arasaac(10750),
    labels: { zh: ['难过'], en: ['upset', 'sad'] },
    synonyms: ['不开心', '伤感'],
    disambiguationHints: { semanticDomain: 'emotion' },
  },

  // ── PLACES 地点 (+6 items) ─────────────────────────────────────────────────
  {
    id: 'p_bedroom',
    categoryId: 'places',
    imageUrl: arasaac(5988),
    labels: { zh: ['卧室'], en: ['bedroom'] },
    synonyms: ['睡房', '房间'],
    disambiguationHints: { semanticDomain: 'place' },
  },
  {
    id: 'p_kitchen',
    categoryId: 'places',
    imageUrl: arasaac(10752),
    labels: { zh: ['厨房'], en: ['kitchen'] },
    synonyms: [],
    disambiguationHints: { semanticDomain: 'place' },
  },
  {
    id: 'p_living_room',
    categoryId: 'places',
    imageUrl: arasaac(6211),
    labels: { zh: ['客厅'], en: ['living room'] },
    synonyms: ['大厅', '起居室'],
    disambiguationHints: { semanticDomain: 'place' },
  },
  {
    id: 'p_outside',
    categoryId: 'places',
    imageUrl: arasaac(5475),
    labels: { zh: ['外面'], en: ['outside', 'outdoors'] },
    synonyms: ['室外', '户外'],
    disambiguationHints: { semanticDomain: 'place' },
  },
  {
    id: 'p_shop',
    categoryId: 'places',
    imageUrl: arasaac(35695),
    labels: { zh: ['商店'], en: ['shop', 'store'] },
    synonyms: ['商场', '店'],
    disambiguationHints: { semanticDomain: 'place' },
  },
  {
    id: 'p_rehab_dept',
    categoryId: 'places',
    imageUrl: arasaac(32712),
    labels: { zh: ['康复科'], en: ['rehabilitation clinic'] },
    synonyms: ['康复中心', '理疗室'],
    disambiguationHints: { semanticDomain: 'place' },
  },

  // ── PEOPLE 家人与人物 (+4 items) ───────────────────────────────────────────
  {
    id: 'p_husband',
    categoryId: 'people',
    imageUrl: arasaac(8111),
    labels: { zh: ['老公/丈夫'], en: ['husband'] },
    synonyms: ['丈夫', '老公', '爱人'],
    disambiguationHints: { semanticDomain: 'person' },
  },
  {
    id: 'p_wife',
    categoryId: 'people',
    imageUrl: arasaac(8110),
    labels: { zh: ['老婆/妻子'], en: ['wife'] },
    synonyms: ['妻子', '老婆', '爱人'],
    disambiguationHints: { semanticDomain: 'person' },
  },
  {
    id: 'p_son',
    categoryId: 'people',
    imageUrl: arasaac(9887),
    labels: { zh: ['儿子'], en: ['son'] },
    synonyms: ['男孩', '孩子'],
    disambiguationHints: { semanticDomain: 'person' },
  },
  {
    id: 'p_daughter',
    categoryId: 'people',
    imageUrl: arasaac(9885),
    labels: { zh: ['女儿'], en: ['daughter'] },
    synonyms: ['女孩', '孩子'],
    disambiguationHints: { semanticDomain: 'person' },
  },

  // ── OBJECTS 休息舒适 (+3 items) ────────────────────────────────────────────
  {
    id: 'p_table',
    categoryId: 'objects',
    imageUrl: arasaac(3129),
    labels: { zh: ['桌子'], en: ['table'] },
    synonyms: ['桌', '餐桌'],
    disambiguationHints: {},
  },
  {
    id: 'p_blanket',
    categoryId: 'objects',
    imageUrl: arasaac(2459),
    labels: { zh: ['被子'], en: ['blanket', 'duvet'] },
    synonyms: ['毯子', '被褥'],
    disambiguationHints: {},
  },
  {
    id: 'p_lamp',
    categoryId: 'objects',
    imageUrl: arasaac(4936),
    labels: { zh: ['灯'], en: ['lamp', 'light'] },
    synonyms: ['电灯', '灯光'],
    disambiguationHints: {},
  },

  // ── FOOD 吃喝 (+2 items) ───────────────────────────────────────────────────
  {
    id: 'p_rice',
    categoryId: 'food',
    imageUrl: arasaac(6911),
    labels: { zh: ['饭'], en: ['rice', 'meal'] },
    synonyms: ['米饭', '白饭'],
    disambiguationHints: {},
  },
  {
    id: 'p_meat',
    categoryId: 'food',
    imageUrl: arasaac(2316),
    labels: { zh: ['肉'], en: ['meat'] },
    synonyms: ['猪肉', '肉类'],
    disambiguationHints: {},
  },
]

// Read existing data
const existing = JSON.parse(readFileSync(PICTOGRAMS_PATH, 'utf8'))

// Build per-category max manualOrder map
const maxOrderByCategory = {}
for (const p of existing) {
  const cur = maxOrderByCategory[p.categoryId] ?? -1
  maxOrderByCategory[p.categoryId] = Math.max(cur, p.manualOrder ?? 0)
}

// Check for duplicate IDs
const existingIds = new Set(existing.map(p => p.id))
const newIds = NEW_ENTRIES.map(e => e.id)
const duplicateIds = newIds.filter(id => existingIds.has(id))
if (duplicateIds.length > 0) {
  console.error('DUPLICATE IDs found:', duplicateIds)
  process.exit(1)
}

// Check for duplicate imageUrls
const existingUrls = new Set(existing.map(p => p.imageUrl).filter(u => u && !u.startsWith('data:')))
const newArasaacUrls = NEW_ENTRIES.map(e => e.imageUrl).filter(u => !u.startsWith('data:'))
const duplicateUrls = newArasaacUrls.filter(u => existingUrls.has(u))
if (duplicateUrls.length > 0) {
  console.warn('WARNING - Duplicate imageUrls detected:')
  for (const url of duplicateUrls) {
    const existingItem = existing.find(p => p.imageUrl === url)
    const newItem = NEW_ENTRIES.find(e => e.imageUrl === url)
    console.warn(`  ${url}`)
    console.warn(`    existing: ${existingItem?.id} (${existingItem?.labels?.zh?.[0]})`)
    console.warn(`    new:      ${newItem?.id} (${newItem?.labels?.zh?.[0]})`)
  }
  console.warn('Proceeding anyway - check manually if these should use different IDs.')
}

// Assign manualOrder and usageCount to new entries
const nextOrderByCategory = { ...maxOrderByCategory }
const enriched = NEW_ENTRIES.map(entry => {
  const cat = entry.categoryId
  const order = (nextOrderByCategory[cat] ?? -1) + 1
  nextOrderByCategory[cat] = order
  return {
    id: entry.id,
    imageUrl: entry.imageUrl,
    labels: entry.labels,
    categoryId: entry.categoryId,
    synonyms: entry.synonyms ?? [],
    disambiguationHints: entry.disambiguationHints ?? {},
    usageCount: 0,
    manualOrder: order,
  }
})

const combined = [...existing, ...enriched]

writeFileSync(PICTOGRAMS_PATH, JSON.stringify(combined, null, 2) + '\n', 'utf8')

const byCategory = {}
for (const e of enriched) {
  byCategory[e.categoryId] = (byCategory[e.categoryId] || 0) + 1
}
console.log('Added', enriched.length, 'new pictograms:')
for (const [cat, count] of Object.entries(byCategory)) {
  console.log(`  ${cat}: +${count}`)
}
console.log('Total pictograms now:', combined.length)
