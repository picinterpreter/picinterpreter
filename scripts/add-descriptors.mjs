import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FILE = path.join(__dirname, '../public/seed/pictograms.json')

function arasaac(id) {
  return `https://static.arasaac.org/pictograms/${id}/${id}_300.png`
}

const NEW_ENTRIES = [
  // Priority A: size / quantity / speed
  {
    id: 'd_big',
    labels: { zh: ['大'], en: ['big', 'large'] },
    imageUrl: arasaac(4658),
    categoryId: 'descriptors',
    manualOrder: 0,
    disambiguationHints: { semanticDomain: 'descriptors' },
  },
  {
    id: 'd_small',
    labels: { zh: ['小'], en: ['small', 'little'] },
    imageUrl: arasaac(4716),
    categoryId: 'descriptors',
    manualOrder: 1,
    disambiguationHints: { semanticDomain: 'descriptors' },
  },
  {
    id: 'd_many',
    labels: { zh: ['多'], en: ['many', 'a lot'] },
    imageUrl: arasaac(7168),
    categoryId: 'descriptors',
    manualOrder: 2,
    disambiguationHints: { semanticDomain: 'descriptors' },
  },
  {
    id: 'd_few',
    labels: { zh: ['少'], en: ['few', 'little'] },
    imageUrl: arasaac(7209),
    categoryId: 'descriptors',
    manualOrder: 3,
    disambiguationHints: { semanticDomain: 'descriptors' },
  },
  {
    id: 'd_fast',
    labels: { zh: ['快'], en: ['fast', 'quick'] },
    imageUrl: arasaac(5306),
    categoryId: 'descriptors',
    manualOrder: 4,
    disambiguationHints: { semanticDomain: 'descriptors' },
  },
  {
    id: 'd_slow',
    labels: { zh: ['慢'], en: ['slow'] },
    imageUrl: arasaac(4676),
    categoryId: 'descriptors',
    manualOrder: 5,
    disambiguationHints: { semanticDomain: 'descriptors' },
  },
  // Priority B: position / direction
  {
    id: 'd_above',
    labels: { zh: ['上', '上面', '上边'], en: ['above', 'up', 'on top'] },
    imageUrl: arasaac(5451),
    categoryId: 'descriptors',
    manualOrder: 6,
    disambiguationHints: { semanticDomain: 'descriptors' },
  },
  {
    id: 'd_below',
    labels: { zh: ['下', '下面', '下边'], en: ['below', 'down', 'under'] },
    imageUrl: arasaac(5355),
    categoryId: 'descriptors',
    manualOrder: 7,
    disambiguationHints: { semanticDomain: 'descriptors' },
  },
  {
    id: 'd_front',
    labels: { zh: ['前', '前面', '前边'], en: ['front', 'in front'] },
    imageUrl: arasaac(39779),
    categoryId: 'descriptors',
    manualOrder: 8,
    disambiguationHints: { semanticDomain: 'descriptors' },
  },
  {
    id: 'd_behind',
    labels: { zh: ['后', '后面', '后边'], en: ['behind', 'back'] },
    imageUrl: arasaac(5443),
    categoryId: 'descriptors',
    manualOrder: 9,
    disambiguationHints: { semanticDomain: 'descriptors' },
  },
  {
    id: 'd_inside',
    labels: { zh: ['里', '里面', '内'], en: ['inside', 'within'] },
    imageUrl: arasaac(5439),
    categoryId: 'descriptors',
    manualOrder: 10,
    disambiguationHints: { semanticDomain: 'descriptors' },
  },
  {
    id: 'd_outside',
    labels: { zh: ['外', '外面', '外边'], en: ['outside'] },
    imageUrl: arasaac(5475),
    categoryId: 'descriptors',
    manualOrder: 11,
    disambiguationHints: { semanticDomain: 'descriptors' },
  },
  {
    id: 'd_left',
    labels: { zh: ['左', '左边'], en: ['left'] },
    imageUrl: arasaac(9203),
    categoryId: 'descriptors',
    manualOrder: 12,
    disambiguationHints: { semanticDomain: 'descriptors' },
  },
  {
    id: 'd_right',
    labels: { zh: ['右', '右边'], en: ['right'] },
    imageUrl: arasaac(4624),
    categoryId: 'descriptors',
    manualOrder: 13,
    disambiguationHints: { semanticDomain: 'descriptors' },
  },
]

const data = JSON.parse(readFileSync(FILE, 'utf8'))

// Check for duplicate ids
const existingIds = new Set(data.map(p => p.id))
for (const entry of NEW_ENTRIES) {
  if (existingIds.has(entry.id)) {
    console.error(`DUPLICATE ID: ${entry.id}`)
    process.exit(1)
  }
}

data.push(...NEW_ENTRIES)
writeFileSync(FILE, JSON.stringify(data, null, 2) + '\n', 'utf8')
console.log(`Added ${NEW_ENTRIES.length} descriptor entries. Total: ${data.length}`)
